import { Injectable } from '@nestjs/common';
import { CreateModDto } from './dto/create-mod.dto';
import { UpdateModDto } from './dto/update-mod.dto';
import { CreateTokenPlanDto } from './dto/create-token-plan.dto';
import { UpdateTokenPlanDto } from './dto/update-token-plan.dto';
import { ApplyModDto } from './dto/apply-mod.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Mods, ModTokenPlans, ModsDocument } from './mods.schema';
import { Model } from 'mongoose';
import { SpacesService } from '../spaces/spaces.service';
import { converterFromName, setupConversion } from './convertor/main';
import path from 'path';
import fs from 'node:fs';
import { UsersService } from 'src/users/users.service';
import { lookup } from 'mime-types';
import { spacesConfig } from 'src/spaces/config';
import { TokenPlanOutDto } from './dto/token-plan-out.dto';

@Injectable()
export class ModsService {
  constructor(
    @InjectModel(Mods.name) private modsModel: Model<ModsDocument>,
    @InjectModel(ModTokenPlans.name)
    private modTokenPlansModel: Model<ModTokenPlans>,
    private spacesService: SpacesService,
    private usersService: UsersService,
  ) {}

  async findAllMods(tags: string[]) {
    return await this.modsModel.find({ tags: tags }).exec();
  }

  async findMod(modID: string) {
    return await this.modsModel.findOne({ modID: modID });
  }

  async createMod(modID: string, createModDto: CreateModDto) {
    const createdMod = new this.modsModel({ modID: modID, ...createModDto });
    return await createdMod.save();
  }

  async updateMod(modID: string, updateModDto: UpdateModDto) {
    return await this.modsModel.findOneAndUpdate(
      { modID: modID },
      updateModDto,
    );
  }

  async removeMod(modID: string) {
    return await this.modsModel.findOneAndDelete({ modID: modID });
  }

  async findAllTokenPlans(): Promise<TokenPlanOutDto[]> {
    return await this.modTokenPlansModel.find().exec();
  }

  async findTokenPlan(planID: string): Promise<TokenPlanOutDto> {
    return await this.modTokenPlansModel.findOne({ planID: planID });
  }

  async createTokenPlan(
    planID: string,
    createTokenPlanDto: CreateTokenPlanDto,
  ): Promise<TokenPlanOutDto> {
    const createdModTokenPlan = new this.modTokenPlansModel({
      planID: planID,
      ...createTokenPlanDto,
    });
    return await createdModTokenPlan.save();
  }

  async updateTokenPlan(
    planID: string,
    updateTokenPlanDto: UpdateTokenPlanDto,
  ): Promise<TokenPlanOutDto> {
    return await this.modTokenPlansModel.findOneAndUpdate(
      { planID: planID },
      updateTokenPlanDto,
      {
        new: true,
      },
    );
  }

  async removeTokenPlan(planID: string): Promise<TokenPlanOutDto> {
    return await this.modTokenPlansModel.findOneAndDelete({ planID: planID });
  }

  async applyMod(userId: string, modId: string, applyModDto: ApplyModDto) {

    const file = await this.spacesService.checkReadPerms(
      userId,
      applyModDto.fileId,
      'file',
    );

    const [converter, ext] = converterFromName(modId);

    try {
      const [inputPath, outputPath, scratch] = setupConversion(
        file.fileName,
        path.join(spacesConfig.fileStorageRootDir, String(file._id)),
        ext,
      );
      console.log(inputPath, outputPath, scratch, ext);

      await converter(inputPath, outputPath, null);

      const baseName = path.basename(
        file.fileName,
        path.extname(file.fileName),
      );
      const outputFileName = `${baseName}${ext}`;

      const now = new Date();
      const outputFileSize = fs.statSync(outputPath).size;

      const outputMimeType = lookup(outputPath);
      if (outputMimeType === false) {
        throw new Error('No valid MIME detected');
      }
      console.log(now, outputFileSize, file.spaceParent, outputMimeType);
      console.log(file);

      // Create an entry for the converted file in the database.
      const createdFile = await this.spacesService.createFile({
        mimeType: outputMimeType,
        size: outputFileSize,
        spaceParent: file.spaceParent,
        fileName: outputFileName,
        created: now,
        lastEdited: now,
        owner: userId,
      });

      console.log(createdFile);

      // Write the converted file to the server storage.
      const diskPath = path.join(
        spacesConfig.fileStorageRootDir,
        String(createdFile._id),
      );
      fs.copyFileSync(outputPath, diskPath);

      // Update the consumed storage data.
      await this.usersService.consumeStorageSpace(userId, outputFileSize);

      // Remove the scratch files and directory used for conversion.
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
      fs.rmdirSync(scratch);

      return createdFile;
    } catch (err) {
      console.error(err);
    }

    // load the mod to apply
    // load the dto of mod params
    // check if user has rights to access fileID
    // validate mod params
    // return error if incorrect/insufficient mod params
    // create background task to process this mod
    // return task id so that people can get the status of the mod
    return undefined;
  }

  async checkModOpStatus(taskID: string) {
    // validate if the requester is the creator of this task
    // check the status of the task with given task id
    // return processing if still not complete
    // return the file id of result file, and no of tokens consumed when complete
    return taskID;
  }
}
