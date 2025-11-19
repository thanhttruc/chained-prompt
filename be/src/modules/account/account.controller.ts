import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('accounts')
@Controller('v1/accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách tài khoản của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tài khoản thành công',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getAccounts(@Request() req) {
    const userId = req.user.userId;
    const accounts = await this.accountService.findAllByUserId(userId);

    return {
      success: true,
      message: 'Lấy danh sách tài khoản thành công',
      data: {
        user_id: userId,
        accounts,
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo tài khoản mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo tài khoản thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 409,
    description: 'Tài khoản đã tồn tại',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async createAccount(@Request() req, @Body() createAccountDto: CreateAccountDto) {
    const userId = req.user.userId;
    const account = await this.accountService.create(userId, createAccountDto);

    return {
      message: 'Account created successfully',
      account,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết tài khoản kèm giao dịch gần đây' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết tài khoản thành công',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền xem tài khoản này',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Không tìm thấy tài khoản',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getAccountDetail(@Request() req, @Param('id') id: string) {
    // Kiểm tra và lấy userId từ JWT payload
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Không thể xác thực người dùng. Vui lòng đăng nhập lại.');
    }
    
    const userId = req.user.userId;
    const accountId = parseInt(id, 10);
    
    if (isNaN(accountId)) {
      throw new BadRequestException('ID tài khoản không hợp lệ.');
    }
    
      const accountData = await this.accountService.findOneWithTransactions(accountId, userId);

    return accountData;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật tài khoản thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền chỉnh sửa tài khoản này',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Không tìm thấy tài khoản',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async updateAccount(
    @Request() req,
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    // Kiểm tra và lấy userId từ JWT payload
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Không thể xác thực người dùng. Vui lòng đăng nhập lại.');
    }

    const userId = req.user.userId;
    const accountId = parseInt(id, 10);

    if (isNaN(accountId)) {
      throw new BadRequestException('ID tài khoản không hợp lệ.');
    }

    const updatedAccount = await this.accountService.update(accountId, userId, updateAccountDto);

    return {
      message: 'Account updated successfully',
      account: updatedAccount,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tài khoản và tất cả giao dịch liên quan' })
  @ApiResponse({
    status: 200,
    description: 'Xóa tài khoản thành công',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Không tìm thấy tài khoản hoặc không thuộc sở hữu của người dùng',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async deleteAccount(@Request() req, @Param('id') id: string) {
    // Kiểm tra và lấy userId từ JWT payload
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Không thể xác thực người dùng. Vui lòng đăng nhập lại.');
    }

    const userId = req.user.userId;
    const accountId = parseInt(id, 10);

    if (isNaN(accountId)) {
      throw new BadRequestException('ID tài khoản không hợp lệ.');
    }

    const result = await this.accountService.delete(accountId, userId);

    return {
      message: 'Account deleted successfully',
      deleted_account_id: result.deleted_account_id,
    };
  }
}

