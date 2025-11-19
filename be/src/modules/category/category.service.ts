import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  /**
   * Lấy danh sách tất cả categories
   * @returns Danh sách categories
   */
  async findAll() {
    try {
      const categories = await this.categoryRepository.find({
        select: ['categoryId', 'categoryName'],
        order: {
          categoryName: 'ASC',
        },
      });

      // Map dữ liệu để trả về đúng format
      return categories.map((category) => ({
        category_id: category.categoryId,
        category_name: category.categoryName,
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi lấy danh sách danh mục. Vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Lấy chi tiết một category
   * @param categoryId - ID của category
   * @returns Chi tiết category
   */
  async findOne(categoryId: number) {
    try {
      const category = await this.categoryRepository.findOne({
        where: { categoryId },
        select: ['categoryId', 'categoryName'],
      });

      if (!category) {
        return null;
      }

      return {
        category_id: category.categoryId,
        category_name: category.categoryName,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi lấy chi tiết danh mục. Vui lòng thử lại sau.',
      );
    }
  }
}

