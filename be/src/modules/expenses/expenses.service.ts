import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionType } from '../transaction/transaction.entity';
import { Account } from '../account/account.entity';
import { Category } from '../category/category.entity';

export interface BreakdownResult {
  category: string;
  total: number;
  changePercent: number | null;
  subCategories: Array<{
    item_description: string;
    amount: number;
    date: string;
  }>;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Lấy tổng hợp chi tiêu theo tháng trong năm hiện tại
   * @param userId - ID của người dùng
   * @returns Mảng các đối tượng { month: string, totalExpense: number }
   */
  async getExpenseSummary(userId: number) {
    try {
      // Lấy danh sách account_id của user
      const accounts = await this.accountRepository.find({
        where: { userId },
        select: ['accountId'],
      });

      if (accounts.length === 0) {
        return [];
      }

      const accountIds = accounts.map((acc) => acc.accountId);

      // Lấy năm hiện tại
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

      // Truy vấn và nhóm theo tháng sử dụng raw SQL với parameterized query
      // accountIds đã được validate từ database nên an toàn
      const accountIdsStr = accountIds.join(',');
      const query = `
        SELECT 
          MONTH(transaction_date) as month,
          CAST(SUM(amount) AS DECIMAL(15,2)) as totalExpense
        FROM Transactions
        WHERE account_id IN (${accountIdsStr})
          AND type = ?
          AND transaction_date >= ?
          AND transaction_date <= ?
        GROUP BY MONTH(transaction_date)
        ORDER BY MONTH(transaction_date) ASC
      `;
      
      const results = await this.dataSource.query(query, [
        TransactionType.EXPENSE,
        startOfYear,
        endOfYear,
      ]);

      // Map kết quả thành format yêu cầu
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      const summary = results.map((result) => ({
        month: monthNames[result.month - 1],
        totalExpense: parseFloat(result.totalExpense) || 0,
      }));

      return summary;
    } catch (error) {
      throw new InternalServerErrorException({
        error: 'Không thể lấy dữ liệu chi tiêu.',
      });
    }
  }

  /**
   * Lấy breakdown chi tiêu theo danh mục cho một tháng cụ thể
   * @param userId - ID của người dùng
   * @param month - Chuỗi tháng định dạng 'YYYY-MM' (ví dụ: '2025-11')
   * @returns Mảng các đối tượng breakdown theo category
   */
  async getExpensesBreakdown(userId: number, month: string) {
    try {
      // Lấy danh sách account_id của user
      const accounts = await this.accountRepository.find({
        where: { userId },
        select: ['accountId'],
      });

      if (accounts.length === 0) {
        throw new NotFoundException({
          error: 'Không có dữ liệu chi tiêu cho tháng này.',
        });
      }

      const accountIds = accounts.map((acc) => acc.accountId);

      // Parse month string (YYYY-MM)
      const [year, monthNum] = month.split('-').map(Number);
      if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
        throw new NotFoundException({
          error: 'Không có dữ liệu chi tiêu cho tháng này.',
        });
      }

      // Tính toán tháng hiện tại và tháng trước
      const currentMonthStart = new Date(year, monthNum - 1, 1);
      const currentMonthEnd = new Date(year, monthNum, 0, 23, 59, 59);

      // Tính previous month
      let previousYear = year;
      let previousMonth = monthNum - 1;
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = year - 1;
      }
      const previousMonthStart = new Date(previousYear, previousMonth - 1, 1);
      const previousMonthEnd = new Date(previousYear, previousMonth, 0, 23, 59, 59);

      // Thực hiện 2 truy vấn song song sử dụng query builder
      const currentMonthQuery = this.transactionRepository
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.category', 'category')
        .where('transaction.accountId IN (:...accountIds)', { accountIds })
        .andWhere('transaction.type = :type', { type: TransactionType.EXPENSE })
        .andWhere('transaction.transactionDate >= :startDate', { startDate: currentMonthStart })
        .andWhere('transaction.transactionDate <= :endDate', { endDate: currentMonthEnd })
        .orderBy('transaction.transactionDate', 'ASC');

      const previousMonthQuery = this.transactionRepository
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.category', 'category')
        .where('transaction.accountId IN (:...accountIds)', { accountIds })
        .andWhere('transaction.type = :type', { type: TransactionType.EXPENSE })
        .andWhere('transaction.transactionDate >= :startDate', { startDate: previousMonthStart })
        .andWhere('transaction.transactionDate <= :endDate', { endDate: previousMonthEnd })
        .orderBy('transaction.transactionDate', 'ASC');

      const [currentMonthData, previousMonthData] = await Promise.all([
        currentMonthQuery.getMany(),
        previousMonthQuery.getMany(),
      ]);

      // Nhóm kết quả theo category_id và tính tổng
      const currentMonthGrouped = new Map<number, { total: number; transactions: Transaction[] }>();
      const previousMonthGrouped = new Map<number, number>();

      // Nhóm tháng hiện tại
      for (const transaction of currentMonthData) {
        const categoryId = transaction.categoryId || 0;
        if (!currentMonthGrouped.has(categoryId)) {
          currentMonthGrouped.set(categoryId, { total: 0, transactions: [] });
        }
        const group = currentMonthGrouped.get(categoryId)!;
        group.total += Number(transaction.amount);
        group.transactions.push(transaction);
      }

      // Nhóm tháng trước
      for (const transaction of previousMonthData) {
        const categoryId = transaction.categoryId || 0;
        const currentTotal = previousMonthGrouped.get(categoryId) || 0;
        previousMonthGrouped.set(categoryId, currentTotal + Number(transaction.amount));
      }

      // Kiểm tra nếu không có giao dịch trong tháng hiện tại
      if (currentMonthGrouped.size === 0) {
        throw new NotFoundException({
          error: 'Không có dữ liệu chi tiêu cho tháng này.',
        });
      }

      // Lấy thông tin category để có tên
      const categoryIds = Array.from(currentMonthGrouped.keys()).filter((id) => id !== 0);
      const categories = categoryIds.length > 0
        ? await this.categoryRepository
            .createQueryBuilder('category')
            .where('category.categoryId IN (:...categoryIds)', { categoryIds })
            .select(['category.categoryId', 'category.categoryName'])
            .getMany()
        : [];

      const categoryMap = new Map(
        categories.map((cat) => [cat.categoryId, cat.categoryName]),
      );

      // Tạo kết quả
      const result: BreakdownResult[] = [];

      for (const [categoryId, { total, transactions }] of currentMonthGrouped.entries()) {
        const previousTotal = previousMonthGrouped.get(categoryId) || 0;

        // Tính changePercent
        let changePercent: number | null = null;
        if (previousTotal === 0) {
          changePercent = total > 0 ? 100 : null;
        } else {
          changePercent = ((total - previousTotal) / previousTotal) * 100;
        }

        // Lấy tên category
        const categoryName = categoryId === 0
          ? 'Uncategorized'
          : categoryMap.get(categoryId) || 'Unknown';

        // Tạo subCategories từ transactions
        const subCategories = transactions.map((t) => {
          // Format date safely
          let dateStr = '';
          if (t.transactionDate) {
            const date = t.transactionDate instanceof Date 
              ? t.transactionDate 
              : new Date(t.transactionDate);
            dateStr = date.toISOString().split('T')[0];
          }
          
          return {
            item_description: t.itemDescription,
            amount: Number(t.amount),
            date: dateStr,
          };
        });

        result.push({
          category: categoryName,
          total: Number(total.toFixed(2)),
          changePercent: changePercent !== null ? Number(changePercent.toFixed(2)) : null,
          subCategories,
        });
      }

      // Sắp xếp theo total giảm dần
      result.sort((a, b) => b.total - a.total);

      return result;
    } catch (error) {
      // Nếu là NotFoundException hoặc BadRequestException thì throw lại
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Log lỗi để debug (chỉ trong development)
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error in getExpensesBreakdown:', error);
      }
      
      throw new InternalServerErrorException({
        error: 'Không thể lấy dữ liệu breakdown chi tiêu.',
      });
    }
  }
}

