import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('expenses')
@Controller('v1/expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy tổng hợp chi tiêu theo tháng trong năm hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Lấy tổng hợp chi tiêu thành công',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getExpenseSummary(@Request() req) {
    const userId = req.user.userId;
    const summary = await this.expensesService.getExpenseSummary(userId);
    return {
      data: summary,
    };
  }

  @Get('breakdown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy breakdown chi tiêu theo danh mục cho một tháng cụ thể' })
  @ApiQuery({
    name: 'month',
    required: true,
    type: String,
    description: 'Tháng định dạng YYYY-MM (ví dụ: 2025-11)',
    example: '2025-11',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy breakdown chi tiêu thành công',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 404,
    description: 'Không có dữ liệu chi tiêu cho tháng này',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getExpensesBreakdown(@Request() req, @Query('month') month: string) {
    // Validation month parameter
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException({
        error: 'Tham số month không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM (ví dụ: 2025-11)',
      });
    }

    const userId = req.user.userId;
    const breakdown = await this.expensesService.getExpensesBreakdown(userId, month);
    return {
      data: breakdown,
    };
  }
}

