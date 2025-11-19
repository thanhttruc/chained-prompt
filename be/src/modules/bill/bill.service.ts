import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Bill } from './bill.entity';

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(Bill)
    private billRepository: Repository<Bill>,
  ) {}

  /**
   * Lấy danh sách hóa đơn sắp tới của user
   * @param userId - ID của người dùng
   * @returns Danh sách hóa đơn đã được lọc và sắp xếp
   */
  async findUpcomingBillsByUserId(userId: number) {
    try {
      const currentDate = new Date();
      // Đặt thời gian về 00:00:00 để so sánh chỉ với ngày
      currentDate.setHours(0, 0, 0, 0);

      const bills = await this.billRepository.find({
        where: {
          userId,
          dueDate: MoreThanOrEqual(currentDate),
        },
        order: {
          dueDate: 'ASC',
        },
      });

      // Map dữ liệu để trả về đúng format
      return bills.map((bill) => ({
        billId: bill.billId,
        userId: bill.userId,
        itemDescription: bill.itemDescription,
        logoUrl: bill.logoUrl || null,
        dueDate: this.formatDate(bill.dueDate),
        lastChargeDate: bill.lastChargeDate ? this.formatDate(bill.lastChargeDate) : null,
        amount: Number(bill.amount),
      }));
    } catch (error) {
      // Log lỗi để debug (chỉ trong development)
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error in findUpcomingBillsByUserId:', error);
      }

      throw new InternalServerErrorException({
        message: 'Failed to fetch bills',
      });
    }
  }

  /**
   * Format date thành string YYYY-MM-DD
   * @param date - Date object hoặc string
   * @returns String date format YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    } else if (typeof date === 'string') {
      // Nếu là string, lấy phần date (YYYY-MM-DD)
      return date.split('T')[0];
    }
    // Fallback
    return new Date(date as any).toISOString().split('T')[0];
  }
}

