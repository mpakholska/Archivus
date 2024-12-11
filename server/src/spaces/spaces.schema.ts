import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { FileVisibility } from './entities/file-visibility.enum';
import { dayInfinity } from './constants';
import { PricingPolicy } from 'src/entities/pricing.entity';

@Schema()
export class FileObject {
  _id: any;
  @Prop({
    required: true,
    index: true,
  })
  spaceParent: string;

  @Prop({ required: true, index: true, default: '' })
  fileName: string;

  @Prop({ required: true, default: false })
  isDir: boolean;

  @Prop({
    required: true,
    index: true,
  })
  owner: string;

  @Prop({ required: true })
  created: Date;

  @Prop()
  lastEdited: Date;

  @Prop({
    required: true,
    enum: FileVisibility,
    default: FileVisibility.private,
  })
  visibility: string;

  @Prop({ required: true, default: [] })
  viewers: string[];

  @Prop({ required: true, default: [] })
  editors: string[];

  @Prop({ required: true, default: [] })
  managers: string[];

  @Prop()
  mimeType: string;

  @Prop()
  size: number;

  @Prop({ required: true, default: false })
  inTrash: boolean;

  @Prop({ required: true, default: dayInfinity })
  trashedOn: Date;
}

@Schema()
export class SpaceQuotas {
  @Prop({ required: true, index: true, unique: true })
  quotaID: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  summary: string;

  @Prop({ required: true })
  spaceGBs: number;

  @Prop({ required: true })
  pricing: PricingPolicy;
}

export type FileObjectDocument = HydratedDocument<FileObject>;
export const FileObjectSchema = SchemaFactory.createForClass(FileObject);

export type SpaceQuotasDocument = HydratedDocument<SpaceQuotas>;
export const SpaceQuotasSchema = SchemaFactory.createForClass(SpaceQuotas);
