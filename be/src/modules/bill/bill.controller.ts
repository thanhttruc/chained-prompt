import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillService } from './bill.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('bills')
@Controller('v1/bills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn sắp tới của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách hóa đơn thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              billId: { type: 'number' },
              userId: { type: 'number' },
              itemDescription: { type: 'string' },
              logoUrl: { type: 'string', nullable: true },
              dueDate: { type: 'string' },
              lastChargeDate: { type: 'string', nullable: true },
              amount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getBills(@Request() req) {
    const userId = req.user.userId;
    const bills = await this.billService.findUpcomingBillsByUserId(userId);

    return {
      data: bills,
    };
  }
}

