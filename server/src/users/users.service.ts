import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { User, UserDocument } from './users.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserPermsOutDto } from './dto/user-perms-out.dto';
import { UserProfileOutDto } from './dto/user-profile-out.dto';
import { UserAccountOutDto } from './dto/user-account-out.dto';
import { StorageSpaceDto } from './dto/storage-space.dto';
import { FindOrCreateUserDto } from './dto/find-or-create-user.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private model: Model<UserDocument>,
  ) {}

  async findOrCreate(userDto: FindOrCreateUserDto) {
    const now = new Date();

    const query = {
      email: userDto.email,
    };
    query[`${userDto.provider}Id`] = userDto.providerId;

    const connectedUser = await this.model.findOne({ ...query });
    if (!connectedUser) {
      let user = await this.model.findOne({ email: userDto.email });
      if (!user) {
        const newUser = new this.model({
          email: userDto.email,
          fullName: userDto.fullName,
          joined: now,
        });
        await newUser.save();
        user = newUser;
      }
      if (user[`${userDto.provider}Id`] != null)
        throw new ForbiddenException(
          `User with given email exists and connected different id for provider ${userDto.provider}`,
        );
      user[`${userDto.provider}Id`] = userDto.providerId;
      user.lastLogin = now;
      return await user.save();
    }
    connectedUser.lastLogin = now;
    await connectedUser.save();
    return connectedUser;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.model(createUserDto);
    return await createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return await this.model.find({}, { hashedPassword: false }).exec();
  }

  async findOneById(
    id: string,
    project: string = 'profile',
  ): Promise<User | undefined> {
    return await this.model.findById(id, project);
  }

  async findIDFromEmail(email: string): Promise<string | null> {
    const user = await this.model.findOne({ email: email });
    if (!user) return null;
    return String(user._id);
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    return await this.model.findOne({ email: email });
  }

  async findPerms(email: string): Promise<UserPermsOutDto | undefined> {
    return await this.model.findOne({ email: email }).select('role isActive');
  }

  async findProfile(id: string): Promise<UserProfileOutDto | undefined> {
    return await this.model.findById(id, { profile: true });
  }

  async updateProfile(
    id: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfileOutDto | undefined> {
    return await this.model
      .findByIdAndUpdate(id, updateUserProfileDto, {
        projection: { profile: true },
        new: true,
      })
      .exec();
  }

  async findAccount(id: string): Promise<UserAccountOutDto | undefined> {
    return await this.model.findById(id, '-profile -hashedPassword');
  }

  async updateAccount(
    id: string,
    updateAccountDto: UpdateUserAccountDto,
  ): Promise<UserAccountOutDto | undefined> {
    return await this.model.findByIdAndUpdate(id, updateAccountDto, {
      projection: '-hashedPassword',
      new: true,
    });
  }

  async remove(id: string) {
    return await this.model.findByIdAndDelete(id);
  }

  // users spaces
  async consumeStorageSpace(ownerId: string, size: number) {
    const user = await this.model.findById(ownerId);
    if (!user)
      throw new NotFoundException(
        "Failed to change user's storage space consumption! User not found",
      );
    user.storageUsed += size;
    if (user.storageUsed < 0)
      throw new BadRequestException('Storage used can not be negative!');
    await user.save();
  }

  async freeStorageSpace(ownerId: string, size: number) {
    await this.consumeStorageSpace(ownerId, -1 * size);
  }

  async findStorageSpace(ownerId: string): Promise<StorageSpaceDto> {
    const user = await this.model.findById(ownerId);
    return { used: user.storageUsed };
  }
}
