import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@ApiTags('transactions')
@Controller('v1/transactions')
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách giao dịch của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách giao dịch thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid type parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getTransactions(
    @Request() req,
    @Query('type') type: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const userId = req.user.userId;
    const result = await this.transactionService.findAllByUserId(
      userId,
      type,
      limit,
      offset,
    );

    return result;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo giao dịch mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo giao dịch thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing transaction data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async createTransaction(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
    const userId = req.user.userId;
    const result = await this.transactionService.create(userId, createTransactionDto);
    return result;
  }
}

