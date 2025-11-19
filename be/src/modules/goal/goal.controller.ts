import {
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GoalService } from './goal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateGoalDto } from './dto/create-goal.dto';

@ApiTags('goals')
@Controller('v1/goals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy mục tiêu tiết kiệm và mục tiêu chi tiêu của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách mục tiêu thành công',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token không hợp lệ hoặc hết hạn',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getGoals(@Request() req) {
    const userId = req.user.userId;
    const goalsData = await this.goalService.getGoals(userId);

    return {
      success: true,
      message: 'Lấy danh sách mục tiêu thành công',
      data: goalsData,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo mục tiêu tiết kiệm hoặc chi tiêu mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo mục tiêu thành công',
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
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async createGoal(@Request() req, @Body() createGoalDto: CreateGoalDto) {
    const userId = req.user.userId;
    const result = await this.goalService.createGoal(userId, createGoalDto);

    return {
      message: 'Goal created successfully',
      goal_id: result.goalId,
    };
  }

  @Put(':goalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật mục tiêu tiết kiệm hoặc chi tiêu' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật mục tiêu thành công',
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
    description: 'Forbidden - Không có quyền chỉnh sửa mục tiêu này',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Không tìm thấy mục tiêu',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async updateGoal(
    @Request() req,
    @Param('goalId') goalId: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    const userId = req.user.userId;
    const result = await this.goalService.updateGoal(
      parseInt(goalId, 10),
      userId,
      updateGoalDto,
    );

    return {
      message: 'Goal updated successfully',
      updated_goal: {
        goal_id: result.goalId,
        target_amount: Number(result.targetAmount),
      },
    };
  }
}

