import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../transaction/transaction.entity';
import { Account } from '../account/account.entity';
import { SavingsSummaryResponse, MonthlySavings } from './dto/savings-summary-response.dto';

@Injectable()
export class SavingsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  /**
   * Tính tổng tiết kiệm ròng theo tháng cho một năm cụ thể
   * @param userId - ID của người dùng
   * @param year - Năm cần tính toán
   * @returns Mảng 12 tháng với số tiền tiết kiệm ròng
   */
  async getSavingsSummary(userId: number, year: number): Promise<SavingsSummaryResponse> {
    try {
      // 1. Lấy danh sách account_id của user
      const accounts = await this.accountRepository.find({
        where: { userId },
        select: ['accountId'],
      });

      if (accounts.length === 0) {
        // Nếu không có tài khoản, trả về mảng 12 tháng với giá trị 0
        const emptyYear = this.generateEmptyYear();
        return {
          user_id: userId,
          year,
          summary: {
            this_year: emptyYear,
            last_year: emptyYear,
          },
        };
      }

      const accountIds = accounts.map((acc) => acc.accountId);

      // 2. Tính toán cho năm hiện tại (this_year)
      const thisYear = await this.calculateYearlySavings(accountIds, year);

      // 3. Tính toán cho năm trước (last_year)
      const lastYear = await this.calculateYearlySavings(accountIds, year - 1);

      return {
        user_id: userId,
        year,
        summary: {
          this_year: thisYear,
          last_year: lastYear,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'An internal server error occurred while processing the savings summary.',
      );
    }
  }

  /**
   * Tính toán tiết kiệm ròng cho từng tháng trong một năm
   * @param accountIds - Mảng các account_id
   * @param year - Năm cần tính toán
   * @returns Mảng 12 tháng với số tiền tiết kiệm ròng
   */
  private async calculateYearlySavings(
    accountIds: number[],
    year: number,
  ): Promise<MonthlySavings[]> {
    // Tạo mảng kết quả cho 12 tháng
    const monthlySavings: MonthlySavings[] = [];

    for (let month = 1; month <= 12; month++) {
      // Tạo khoảng thời gian cho tháng đó
      // month - 1 vì Date month bắt đầu từ 0 (0 = January, 11 = December)
      const startDate = new Date(year, month - 1, 1);
      // month (không -1) sẽ tạo ngày đầu tháng sau, rồi set day = 0 sẽ lùi về ngày cuối tháng trước
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // Truy vấn Revenue (Thu nhập) trong tháng
      const revenueResult = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'total')
        .where('transaction.accountId IN (:...accountIds)', { accountIds })
        .andWhere('transaction.type = :type', { type: TransactionType.REVENUE })
        .andWhere('transaction.transactionDate >= :startDate', { startDate })
        .andWhere('transaction.transactionDate <= :endDate', { endDate })
        .getRawOne();

      const totalRevenue = parseFloat(revenueResult?.total || '0');

      // Truy vấn Expense (Chi tiêu) trong tháng
      const expenseResult = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'total')
        .where('transaction.accountId IN (:...accountIds)', { accountIds })
        .andWhere('transaction.type = :type', { type: TransactionType.EXPENSE })
        .andWhere('transaction.transactionDate >= :startDate', { startDate })
        .andWhere('transaction.transactionDate <= :endDate', { endDate })
        .getRawOne();

      const totalExpense = parseFloat(expenseResult?.total || '0');

      // Tính tiết kiệm ròng = Thu nhập - Chi tiêu
      const netSavings = totalRevenue - totalExpense;

      // Format tháng với 2 chữ số (01, 02, ..., 12)
      const monthString = month.toString().padStart(2, '0');

      monthlySavings.push({
        month: monthString,
        amount: Math.round(netSavings * 100) / 100, // Làm tròn đến 2 chữ số thập phân
      });
    }

    return monthlySavings;
  }

  /**
   * Tạo mảng 12 tháng với giá trị 0
   * @returns Mảng 12 tháng với amount = 0
   */
  private generateEmptyYear(): MonthlySavings[] {
    return Array.from({ length: 12 }, (_, index) => ({
      month: (index + 1).toString().padStart(2, '0'),
      amount: 0,
    }));
  }
}

