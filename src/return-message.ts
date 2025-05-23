import { ApiProperty } from '@nestjs/swagger';
import { HttpException } from '@nestjs/common';
import {
  AnyClass,
  ClassOrArray,
  getClassFromClassOrArray,
  InsertField,
  ParseType,
} from './insert-field';

export interface PageSettingsWise {
  pageCount: number;
  recordsPerPage: number;
}

export interface BlankReturnMessage {
  statusCode: number;
  message: string;
  success: boolean;
  timestamp: Date;
}

export interface ReturnMessage<T> extends BlankReturnMessage {
  data?: T;
}

export class BlankReturnMessageDto implements BlankReturnMessage {
  @ApiProperty({ description: 'Return code', type: Number })
  statusCode: number;
  @ApiProperty({ description: 'Return message', type: String })
  message: string;
  @ApiProperty({ description: 'Whether success.', type: Boolean })
  success: boolean;
  @ApiProperty({ description: 'Return timestamp', type: Date })
  timestamp: Date;
  constructor(statusCode: number, message?: string) {
    this.statusCode = statusCode;
    this.message = message || 'success';
    this.success = statusCode < 400;
    this.timestamp = new Date();
  }

  toException() {
    return new HttpException(this, this.statusCode);
  }
}

export class BlankPaginatedReturnMessageDto
  extends BlankReturnMessageDto
  implements PageSettingsWise
{
  @ApiProperty({ description: 'Total record count.', type: Number })
  total: number;
  @ApiProperty({ description: 'Total page count.', type: Number })
  totalPages: number;
  @ApiProperty({ description: 'Current page.', type: Number })
  pageCount: number;
  @ApiProperty({ description: 'Records per page.', type: Number })
  recordsPerPage: number;
  constructor(
    statusCode: number,
    message: string,
    total: number,
    pageSettings: PageSettingsWise,
  ) {
    super(statusCode, message);
    this.total = total;
    this.pageCount = pageSettings.pageCount;
    this.recordsPerPage = pageSettings.recordsPerPage;
    this.totalPages = Math.ceil(total / pageSettings.recordsPerPage);
  }
}

export class GenericReturnMessageDto<T>
  extends BlankReturnMessageDto
  implements ReturnMessage<T>
{
  data?: T;
  constructor(statusCode: number, message?: string, data?: T) {
    super(statusCode, message);
    this.data = data;
  }
}

export function ReturnMessageDto<T extends ClassOrArray>(
  type: T,
): new (
  statusCode: number,
  message: string,
  data: ParseType<T>,
) => GenericReturnMessageDto<ParseType<T>> {
  return InsertField(
    GenericReturnMessageDto,
    {
      data: {
        type,
        options: {
          required: false,
          description: 'Return data.',
        },
      },
    },
    `${getClassFromClassOrArray(type).name}${Array.isArray(type) ? 'Array' : ''}ReturnMessageDto`,
  );
}

export class GenericPaginatedReturnMessageDto<T>
  extends BlankPaginatedReturnMessageDto
  implements PageSettingsWise, ReturnMessage<T[]>
{
  data: T[];
  constructor(
    statusCode: number,
    message: string,
    data: T[],
    total: number,
    pageSettings: PageSettingsWise,
  ) {
    super(statusCode, message, total, pageSettings);
    this.data = data;
  }
}

export function PaginatedReturnMessageDto<T extends AnyClass>(
  type: T,
): new (
  statusCode: number,
  message: string,
  data: InstanceType<T>[],
  total: number,
  pageSettings: PageSettingsWise,
) => GenericPaginatedReturnMessageDto<InstanceType<T>> {
  return InsertField(
    GenericPaginatedReturnMessageDto,
    {
      data: {
        type: [type],
        options: {
          required: false,
          description: 'Return data.',
        },
      },
    },
    `${getClassFromClassOrArray(type).name}PaginatedReturnMessageDto`,
  );
}

export class StringReturnMessageDto extends GenericReturnMessageDto<string> {
  @ApiProperty({ description: 'Return data.', type: String, required: false })
  data: string;
}
