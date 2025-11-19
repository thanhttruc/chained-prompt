import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoryService } from './category.service';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách tất cả categories' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách categories thành công',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getCategories() {
    const categories = await this.categoryService.findAll();

    return {
      success: true,
      message: 'Lấy danh sách danh mục thành công',
      data: categories,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy chi tiết một category' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết category thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Category không tồn tại',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi hệ thống',
  })
  async getCategory(@Param('id', ParseIntPipe) id: number) {
    const category = await this.categoryService.findOne(id);

    if (!category) {
      throw new NotFoundException('Category không tồn tại');
    }

    return {
      success: true,
      message: 'Lấy chi tiết danh mục thành công',
      data: category,
    };
  }
}

