import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Header,
  Res,
  Req,
  StreamableFile,
  UseInterceptors,
  UploadedFiles,
  UnauthorizedException,
  NotImplementedException,
} from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { CreateSpacesQuotaDto } from './dto/create-spaces-quota.dto';
import { UpdateSpacesQuotaDto } from './dto/update-spaces-quota.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { createReadStream } from 'fs';
import { FileUploadDto } from './dto/file-upload.dto';
import { Roles } from 'src/auth/roles.decorator';
import { URoles } from 'src/users/users.schema';
import { Public } from 'src/auth/public.decorator';
import { writeFile } from 'fs/promises';
import * as path from 'path';
import { ShareFileAccessDto } from './dto/share-file-access-dto';
import { splitSpacePath, trimSlashes } from 'src/utils/space-paths';
import { SpacePath } from './dto/space-path.dto';
import { CopyFileDto } from './dto/copy-file.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { UsersService } from 'src/users/users.service';
import { RevokeFileAccessDto } from './dto/revoke-file-access.dto';
import { UpdateFileAccessResponseDto } from './dto/update-file-access-response.dto';
import { AuthorizedRequest } from 'src/auth/entities/authorized-request.entity';
import { spacesConfig } from './config';
import { SpacesQuotaOutDto } from './dto/spaces-quota-out.dto';

@ApiCookieAuth()
@ApiBearerAuth()
@ApiTags('spaces')
@Controller('spaces')
export class SpacesController {
  constructor(
    private readonly service: SpacesService,
    private usersService: UsersService,
  ) {}

  /*
   * endpoints related to files upload and access
   */

  @Post('usage/')
  @ApiOperation({
    summary: 'Get storage usage statistics of user',
  })
  async fetchUsage(
    @Req() req: AuthorizedRequest,
    @Body() spacePath: SpacePath,
  ) {
    return await this.service.fetchUsage(String(req.perms._id), spacePath);
  }

  @Post('create/')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Create a directory or upload files',
    description:
      'The files array can be empty, to create a directory with the name of spacePath. If there are single or multiple files, then spacePath is the directory where these files live.',
  })
  async createFile(
    @Req() req: AuthorizedRequest,
    @Body() data: FileUploadDto,
    @UploadedFiles()
    files: Array<Express.Multer.File>,
  ): Promise<any> {
    let spaceParent = data.spaceParent;
    console.log(files);
    console.log(req.perms._id);
    spaceParent = trimSlashes(spaceParent);
    console.log(spaceParent);

    const now = new Date();
    if (files.length == 0) {
      console.log('no files received, create a dir');

      const dirPath = splitSpacePath(spaceParent);
      return await this.service.createFile({
        spaceParent: dirPath.spaceParent,
        fileName: dirPath.fileName,
        isDir: true,
        created: now,
        owner: req.perms._id,
      });
    }

    const createdFiles = [];
    for (const file of files) {
      const createdFile = await this.service.createFile({
        mimeType: file.mimetype,
        size: file.size,
        spaceParent: spaceParent,
        fileName: file.originalname,
        created: now,
        lastEdited: now,
        owner: req.perms._id,
      });
      createdFiles.push(createdFile);
      console.log(createdFile._id);
      const diskPath = path.join(
        spacesConfig.fileStorageRootDir,
        String(createdFile._id),
      );
      await writeFile(diskPath, file.buffer);
      await this.usersService.consumeStorageSpace(req.perms._id, file.size);
    }

    return createdFiles;
  }

  /*
  file access logic
  if req for path then  search in self drive, and check that path
  if req for id then search by id and check access
  */

  @Post('share/')
  @ApiOperation({
    summary: 'Share a file with others.',
    description: 'You change the editors and viewers of current file',
  })
  async shareFile(
    @Req() req: AuthorizedRequest,
    @Body() shareFileDto: ShareFileAccessDto,
  ): Promise<UpdateFileAccessResponseDto> {
    shareFileDto.spaceParent = trimSlashes(shareFileDto.spaceParent);
    return await this.service.shareFileAccess(
      String(req.perms._id),
      shareFileDto,
    );
  }

  @Post('revoke/')
  @ApiOperation({
    summary: 'Revoke user access for a file',
  })
  async revokeAccess(
    @Req() req: AuthorizedRequest,
    @Body() revokeAccessDto: RevokeFileAccessDto,
  ): Promise<UpdateFileAccessResponseDto> {
    revokeAccessDto.spaceParent = trimSlashes(revokeAccessDto.spaceParent);
    return await this.service.revokeFileAccess(
      String(req.perms._id),
      revokeAccessDto,
    );
  }

  @Post('trash/')
  @ApiOperation({
    summary: 'Get contents of trash',
  })
  async getMetaFromTrash(
    @Req() req: AuthorizedRequest,
    @Body() spacePath: SpacePath,
  ) {
    spacePath.spaceParent = trimSlashes(spacePath.spaceParent);
    return await this.service.findMeta(String(req.perms._id), spacePath, true);
  }

  @Delete('trash/')
  @ApiOperation({
    summary:
      'Send a directory and all its subdirectories and files within them to trash',
  })
  async moveToTrash(
    @Req() req: AuthorizedRequest,
    @Body() spacePath: SpacePath,
  ) {
    spacePath.spaceParent = trimSlashes(spacePath.spaceParent);
    return await this.service.moveToTrash(String(req.perms._id), spacePath);
  }

  @Post('trash/recover')
  @ApiOperation({
    summary: 'Recover items from trash',
  })
  async recoverFromTrash(
    @Req() req: AuthorizedRequest,
    @Body() spacePath: SpacePath,
  ) {
    spacePath.spaceParent = trimSlashes(spacePath.spaceParent);
    return await this.service.recoverFromTrash(
      String(req.perms._id),
      spacePath,
    );
  }

  @Post('get-id/')
  @ApiOperation({
    summary: 'Get the file id of a file in user space, from its space path',
  })
  async getIdBySpacePath(
    @Req() req: AuthorizedRequest,
    @Body() spacePath: SpacePath,
  ) {
    spacePath.spaceParent = trimSlashes(spacePath.spaceParent);
    return await this.service.findIdBySpacePath(
      String(req.perms._id),
      spacePath,
    );
  }

  @Get('meta/:fileId')
  @ApiOperation({
    summary: 'Get metadata about a file or directory identified by its ID',
  })
  async getMetaById(
    @Req() req: AuthorizedRequest,
    @Param('fileId') fileId: string,
  ) {
    return await this.service.findFileById(String(req.perms._id), {
      fileId: fileId,
    });
  }

  @Post('meta/')
  @ApiOperation({
    summary: 'Get metadata about a file or directory in user space',
  })
  async getMeta(@Req() req: AuthorizedRequest, @Body() spacePath: SpacePath) {
    spacePath.spaceParent = trimSlashes(spacePath.spaceParent);
    return await this.service.findMeta(String(req.perms._id), spacePath);
  }

  @Put('cp/')
  @ApiOperation({
    summary: 'Copy a file or directory in user space',
  })
  async copyFile(
    @Req() req: AuthorizedRequest,
    @Body() copyFileDto: CopyFileDto,

  ) {
    copyFileDto.spaceParent = trimSlashes(copyFileDto.spaceParent);
    return await this.service.copyFile(String(req.perms._id), copyFileDto);
  }

  @Patch('mv/')
  @ApiOperation({
    summary: 'Move a file or directory in user space',
  })
  async moveFile(
    @Req() req: AuthorizedRequest,
    @Body() moveFileDto: MoveFileDto,
  ) {
    moveFileDto.sourcePath.spaceParent = trimSlashes(
      moveFileDto.sourcePath.spaceParent,
    );
    moveFileDto.destPath.spaceParent = trimSlashes(
      moveFileDto.destPath.spaceParent,
    );
    return await this.service.moveFile(String(req.perms._id), moveFileDto);
  }

  @Get('stream/:fileId')
  @ApiOperation({
    summary: 'Stream a file by ID if user has access',
  })
  @Header('Content-Type', 'application/octet-stream')
  async streamFile(
    @Req() req: AuthorizedRequest,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const fileObj = await this.service.checkReadPerms(
      String(req.perms._id),
      fileId,
      'file',
    );
    console.log(fileObj);

    if (!fileObj) throw new UnauthorizedException();

    const diskPath = path.resolve(spacesConfig.fileStorageRootDir, fileId);
    console.log(diskPath);
    console.log(fileObj.fileName);

    const file = createReadStream(diskPath);
    console.log(fileObj.mimeType);
    res.set({
      'Content-Disposition': `inline; filename="${fileObj.fileName}"`,
    });
    return new StreamableFile(file);
  }

  @Get('get/:fileID/:fileName')
  @ApiOperation({
    summary: 'Send entire file if user has access',
  })
  async getFile(
    @Req() req: AuthorizedRequest,
    @Param('fileID') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const fileObj = await this.service.checkReadPerms(
      String(req.perms._id),
      fileId,
      'file',
    );
    console.log(fileObj);
    if (!fileObj) throw new UnauthorizedException();
    const diskPath = path.resolve(spacesConfig.fileStorageRootDir, fileId);
    console.log(diskPath);
    console.log(fileObj.fileName);
    console.log(fileObj.mimeType);
    res.set({
      'Content-Disposition': `inline; filename="${fileObj.fileName}"`,
      'Content-Type': fileObj.mimeType,
    });
    throw new NotImplementedException(
      'Serving a single file like static assets is suffering from unknown bugs',
    );
    res.sendFile(
      '/home/aahnik/Projects/fsd/archivus/server/storage/public/avatar/aahnikdaw.png',
      // {
      //   // headers: {
      //   //   'Content-Disposition': `inline; filename="aahnikdaw.png"`,
      //   //   'Content-Type': 'image/png',
      //   // },
      // },
      (err) => {
        console.log(err);
      },
    );
  }

  /*
   * endpoints related to spaces quota
   */

  @Public()
  @Get('/quotas')
  @ApiOperation({ summary: 'Get list of all space quotas availaible.' })
  async findAllSpaceQuotas(): Promise<SpacesQuotaOutDto[]> {
    return await this.service.findAllSpaceQuotas();
  }

  @Public()
  @Get('/quotas/:quotaID')
  @ApiOperation({ summary: 'Get all details of a specific spaces quota.' })
  async findSpacesQuota(
    @Param('quotaID') quotaID: string,
  ): Promise<SpacesQuotaOutDto> {
    return await this.service.findSpacesQuota(quotaID);
  }

  @Roles(URoles.superuser, URoles.admin)
  @Post('/quotas/:quotaID')
  @ApiOperation({ summary: 'Create a new spaces quota' })
  async createSpacesQuota(
    @Param('quotaID') quotaID: string,
    @Body() createSpacesQuotaDto: CreateSpacesQuotaDto,
  ): Promise<SpacesQuotaOutDto> {
    return await this.service.createSpacesQuota(quotaID, createSpacesQuotaDto);
  }

  @Roles(URoles.superuser, URoles.admin)
  @Patch('/quotas/:quotaID')
  @ApiOperation({ summary: 'Update and existing spaces quota' })
  async updateSpacesQuota(
    @Param('quotaID') quotaID: string,
    @Body() updateSpacesQuotaDto: UpdateSpacesQuotaDto,
  ): Promise<SpacesQuotaOutDto> {
    return await this.service.updateSpacesQuota(quotaID, updateSpacesQuotaDto);
  }

  @Roles(URoles.superuser, URoles.admin)
  @Delete('/quotas/:quotaID')
  @ApiOperation({ summary: 'Remove an existing spaces quota' })
  async removeSpacesQuota(
    @Param('quotaID') quotaID: string,
  ): Promise<SpacesQuotaOutDto> {
    return await this.service.removeSpacesQuota(quotaID);
  }
}
