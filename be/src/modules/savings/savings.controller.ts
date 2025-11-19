import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SavingsService } from './savings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SavingsSummaryResponse } from './dto/savings-summary-response.dto';

@ApiTags('savings')
@Controller('v1/savings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy tổng hợp tiết kiệm theo tháng cho năm được chỉ định' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Năm cần lấy dữ liệu (mặc định là năm hiện tại)',
    example: 2025,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy tổng hợp tiết kiệm thành công',
    schema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', example: 1 },
        year: { type: 'number', example: 2025 },
        summary: {
          type: 'object',
          properties: {
            this_year: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string', example: '01' },
                  amount: { type: 'number', example: 1500000 },
                },
              },
            },
            last_year: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string', example: '01' },
                  amount: { type: 'number', example: 1200000 },
                },
              },
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
  async getSavingsSummary(
    @Request() req,
    @Query('year') year?: string,
  ): Promise<SavingsSummaryResponse> {
    // Kiểm tra và lấy userId từ JWT payload
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Không thể xác thực người dùng. Vui lòng đăng nhập lại.');
    }

    const userId = req.user.userId;

    // Xử lý tham số year: nếu không có hoặc không hợp lệ, mặc định là năm hiện tại
    let targetYear: number;
    if (year) {
      const parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        // Nếu year không hợp lệ, dùng năm hiện tại
        targetYear = new Date().getFullYear();
      } else {
        targetYear = parsedYear;
      }
    } else {
      targetYear = new Date().getFullYear();
    }

    const result = await this.savingsService.getSavingsSummary(userId, targetYear);

    return result;
  }
}

