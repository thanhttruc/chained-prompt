import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './transaction.entity';
import { Account } from '../account/account.entity';
import { Category } from '../category/category.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
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
   * Lấy danh sách giao dịch của user với phân trang và lọc theo type
   * @param userId - ID của người dùng
   * @param type - Loại giao dịch: "All" | "Revenue" | "Expense"
   * @param limit - Số lượng bản ghi mỗi trang (mặc định 10)
   * @param offset - Vị trí bắt đầu (mặc định 0)
   * @returns Danh sách giao dịch với total và hasMore
   */
  async findAllByUserId(
    userId: number,
    type: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    try {
      // Validate type parameter
      if (type !== 'All' && type !== 'Revenue' && type !== 'Expense') {
        throw new BadRequestException('Invalid type parameter');
      }

      // Lấy danh sách account_id của user
      const accounts = await this.accountRepository.find({
        where: { userId },
        select: ['accountId'],
      });

      if (accounts.length === 0) {
        return {
          data: [],
          total: 0,
          hasMore: false,
        };
      }

      const accountIds = accounts.map((acc) => acc.accountId);

      // Xây dựng query builder
      const queryBuilder = this.transactionRepository
        .createQueryBuilder('transaction')
        .where('transaction.accountId IN (:...accountIds)', { accountIds });

      // Thêm điều kiện lọc theo type nếu không phải "All"
      if (type === 'Revenue') {
        queryBuilder.andWhere('transaction.type = :type', {
          type: TransactionType.REVENUE,
        });
      } else if (type === 'Expense') {
        queryBuilder.andWhere('transaction.type = :type', {
          type: TransactionType.EXPENSE,
        });
      }

      // Đếm tổng số bản ghi (trước khi phân trang)
      const total = await queryBuilder.getCount();

      // Áp dụng phân trang và sắp xếp
      const transactions = await queryBuilder
        .orderBy('transaction.transactionDate', 'DESC')
        .skip(offset)
        .take(limit)
        .getMany();

      // Map dữ liệu để trả về đúng format (snake_case để khớp với frontend types)
      const data = transactions.map((transaction) => ({
        transaction_id: transaction.transactionId,
        account_id: transaction.accountId,
        transaction_date: transaction.transactionDate,
        type: transaction.type,
        item_description: transaction.itemDescription,
        shop_name: transaction.shopName || null,
        amount: Number(transaction.amount),
        payment_method: transaction.paymentMethod || null,
        status: transaction.status,
      }));

      // Tính toán hasMore
      const hasMore = offset + transactions.length < total;

      return {
        data,
        total,
        hasMore,
      };
    } catch (error) {
      // Nếu là BadRequestException thì throw lại
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Các lỗi khác throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi lấy danh sách giao dịch. Vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Tạo giao dịch mới cho user
   * @param userId - ID của người dùng (từ JWT)
   * @param createTransactionDto - DTO chứa thông tin giao dịch
   * @returns Giao dịch vừa được tạo
   */
  async create(userId: number, createTransactionDto: CreateTransactionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Kiểm tra tính hợp lệ của dữ liệu
      if (!createTransactionDto.itemDescription || createTransactionDto.itemDescription.trim() === '') {
        throw new BadRequestException('Invalid or missing transaction data');
      }

      if (!createTransactionDto.amount || createTransactionDto.amount <= 0) {
        throw new BadRequestException('Invalid or missing transaction data');
      }

      if (
        createTransactionDto.type !== TransactionType.REVENUE &&
        createTransactionDto.type !== TransactionType.EXPENSE
      ) {
        throw new BadRequestException('Invalid or missing transaction data');
      }

      // 2. Kiểm tra category_id nếu có
      if (createTransactionDto.category_id) {
        const category = await queryRunner.manager.findOne(Category, {
          where: { categoryId: createTransactionDto.category_id },
        });

        if (!category) {
          throw new BadRequestException('Invalid or missing transaction data');
        }
      }

      // 3. Kiểm tra accountId có thuộc về user_id hiện tại không
      const account = await queryRunner.manager.findOne(Account, {
        where: {
          accountId: createTransactionDto.accountId,
          userId: userId,
        },
      });

      if (!account) {
        throw new BadRequestException('Invalid or missing transaction data');
      }

      // 4. Kiểm tra số dư nếu là Expense
      if (createTransactionDto.type === TransactionType.EXPENSE) {
        const currentBalance = Number(account.balance);
        if (currentBalance < createTransactionDto.amount) {
          throw new BadRequestException('Invalid or missing transaction data');
        }
      }

      // 5. Tạo transaction mới
      const newTransaction = new Transaction();
      newTransaction.accountId = createTransactionDto.accountId;
      newTransaction.transactionDate = new Date(createTransactionDto.transactionDate);
      newTransaction.type = createTransactionDto.type;
      newTransaction.itemDescription = createTransactionDto.itemDescription;
      newTransaction.categoryId = createTransactionDto.category_id || null;
      newTransaction.shopName = createTransactionDto.shopName || null;
      newTransaction.amount = createTransactionDto.amount;
      newTransaction.paymentMethod = createTransactionDto.paymentMethod || null;
      newTransaction.status = createTransactionDto.status || TransactionStatus.COMPLETE;

      const savedTransaction = await queryRunner.manager.save(Transaction, newTransaction);

      // 6. Cập nhật số dư trong Accounts
      if (createTransactionDto.type === TransactionType.EXPENSE) {
        account.balance = Number(account.balance) - createTransactionDto.amount;
      } else if (createTransactionDto.type === TransactionType.REVENUE) {
        account.balance = Number(account.balance) + createTransactionDto.amount;
      }

      await queryRunner.manager.save(Account, account);

      // 7. Commit transaction
      await queryRunner.commitTransaction();

      // 8. Trả về response theo format yêu cầu
      return {
        message: 'Transaction created successfully',
        data: {
          transactionId: savedTransaction.transactionId,
          accountId: savedTransaction.accountId,
          transactionDate: savedTransaction.transactionDate,
          type: savedTransaction.type,
          itemDescription: savedTransaction.itemDescription,
          shopName: savedTransaction.shopName,
          amount: Number(savedTransaction.amount),
          paymentMethod: savedTransaction.paymentMethod,
          status: savedTransaction.status,
          receiptId: savedTransaction.receiptId,
          createdAt: new Date(),
          category_id: savedTransaction.categoryId,
        },
      };
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await queryRunner.rollbackTransaction();

      // Nếu là BadRequestException thì throw lại
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Các lỗi khác throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi tạo giao dịch. Vui lòng thử lại sau.',
      );
    } finally {
      // Giải phóng query runner
      await queryRunner.release();
    }
  }
}

