import { Injectable, InternalServerErrorException, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Account } from './account.entity';
import { Transaction, TransactionType } from '../transaction/transaction.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Lấy danh sách tài khoản của user theo user_id
   * @param userId - ID của người dùng
   * @returns Danh sách tài khoản
   */
  async findAllByUserId(userId: number) {
    try {
      const accounts = await this.accountRepository.find({
        where: { userId },
        select: [
          'accountId',
          'bankName',
          'accountType',
          'branchName',
          'accountNumberLast4',
          'balance',
        ],
        order: {
          accountId: 'ASC',
        },
      });

      // Map dữ liệu để trả về đúng format
      return accounts.map((account) => ({
        id: account.accountId,
        bank_name: account.bankName,
        account_type: account.accountType,
        branch_name: account.branchName || null,
        account_number_last_4: account.accountNumberLast4,
        balance: Number(account.balance),
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Tạo tài khoản mới cho user
   * @param userId - ID của người dùng
   * @param createAccountDto - DTO chứa thông tin tài khoản
   * @returns Tài khoản vừa được tạo
   */
  async create(userId: number, createAccountDto: CreateAccountDto) {
    try {
      // Kiểm tra xem số tài khoản đã tồn tại cho user này chưa
      const existingAccount = await this.accountRepository.findOne({
        where: {
          userId,
          accountNumberFull: createAccountDto.account_number_full,
        },
      });

      if (existingAccount) {
        throw new ConflictException('Tài khoản này đã tồn tại trong danh sách của bạn.');
      }

      // Lấy 4 số cuối của số tài khoản
      const accountNumberLast4 = createAccountDto.account_number_full.slice(-4);

      // Tạo tài khoản mới
      const newAccount = this.accountRepository.create({
        userId,
        bankName: createAccountDto.bank_name,
        accountType: createAccountDto.account_type,
        branchName: createAccountDto.branch_name || undefined,
        accountNumberFull: createAccountDto.account_number_full,
        accountNumberLast4,
        balance: createAccountDto.balance,
      });

      const savedAccount = await this.accountRepository.save(newAccount);

      // Trả về đúng format response
      return {
        id: savedAccount.accountId,
        user_id: savedAccount.userId,
        bank_name: savedAccount.bankName,
        account_type: savedAccount.accountType,
        branch_name: savedAccount.branchName || null,
        account_number_last_4: savedAccount.accountNumberLast4,
        balance: Number(savedAccount.balance),
      };
    } catch (error) {
      // Nếu là ConflictException thì throw lại
      if (error instanceof ConflictException) {
        throw error;
      }
      // Các lỗi khác throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Không thể thêm tài khoản lúc này. Vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Lấy chi tiết tài khoản kèm 5 giao dịch gần đây nhất
   * @param accountId - ID của tài khoản
   * @param userId - ID của người dùng (từ JWT)
   * @returns Chi tiết tài khoản với danh sách giao dịch gần đây
   */
  async findOneWithTransactions(accountId: number, userId: number) {
    try {
      // 1. Tìm tài khoản theo accountId
      const account = await this.accountRepository.findOne({
        where: { accountId },
      });

      // 2. Validation 1: Kiểm tra tài khoản có tồn tại không
      if (!account) {
        throw new NotFoundException('Không tìm thấy tài khoản này.');
      }

      // 3. Validation 2: Kiểm tra quyền sở hữu
      if (account.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền xem thông tin tài khoản này.');
      }

      // 4. Lấy 5 giao dịch gần đây nhất của tài khoản này
      const recentTransactions = await this.transactionRepository.find({
        where: { accountId },
        order: { transactionDate: 'DESC' },
        take: 5,
      });

      // 5. Map dữ liệu để trả về đúng format
      const accountData = {
        id: account.accountId,
        bank_name: account.bankName,
        account_type: account.accountType,
        branch_name: account.branchName || null,
        account_number_full: account.accountNumberFull,
        balance: Number(account.balance),
        recent_transactions: recentTransactions.map((transaction) => {
          // Nếu là Expense, amount sẽ là số âm
          const amount = Number(transaction.amount || 0)
          const finalAmount = transaction.type === TransactionType.EXPENSE ? -amount : amount
          
          // Xử lý date an toàn - có thể là Date object hoặc string tùy database driver
          let formattedDate: string
          const transactionDate = transaction.transactionDate as Date | string
          if (transactionDate instanceof Date) {
            formattedDate = transactionDate.toISOString().split('T')[0]
          } else if (typeof transactionDate === 'string') {
            // Nếu là string, lấy phần date (YYYY-MM-DD)
            formattedDate = transactionDate.split('T')[0]
          } else {
            // Fallback: tạo Date object mới
            formattedDate = new Date(transactionDate as any).toISOString().split('T')[0]
          }
          
          return {
            date: formattedDate,
            amount: finalAmount,
            description: transaction.itemDescription || '',
            status: transaction.status || 'Pending',
            receipt_id: transaction.receiptId || null,
            type: transaction.type || TransactionType.EXPENSE,
          }
        }),
      };

      return accountData;
    } catch (error) {
      // Nếu là NotFoundException hoặc ForbiddenException thì throw lại
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      // Log lỗi để debug (chỉ trong development)
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error in findOneWithTransactions:', error);
      }
      
      // Các lỗi khác throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi lấy chi tiết tài khoản. Vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Cập nhật thông tin tài khoản
   * @param accountId - ID của tài khoản cần cập nhật
   * @param userId - ID của người dùng (từ JWT)
   * @param updateAccountDto - DTO chứa thông tin cập nhật
   * @returns Tài khoản đã được cập nhật
   */
  async update(accountId: number, userId: number, updateAccountDto: UpdateAccountDto) {
    try {
      // 1. Tìm tài khoản theo accountId
      const account = await this.accountRepository.findOne({
        where: { accountId },
      });

      // 2. Validation 1: Kiểm tra tài khoản có tồn tại không
      if (!account) {
        throw new NotFoundException('Không tìm thấy tài khoản này.');
      }

      // 3. Validation 2: Kiểm tra quyền sở hữu
      if (account.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền chỉnh sửa thông tin tài khoản này.');
      }

      // 4. Validation 3: Xác thực dữ liệu đầu vào
      // Kiểm tra các trường bắt buộc không rỗng
      if (!updateAccountDto.bank_name || updateAccountDto.bank_name.trim() === '') {
        throw new BadRequestException('Tên ngân hàng không được để trống.');
      }

      if (!updateAccountDto.account_type) {
        throw new BadRequestException('Loại tài khoản không được để trống.');
      }

      if (!updateAccountDto.account_number_full || updateAccountDto.account_number_full.trim() === '') {
        throw new BadRequestException('Số tài khoản đầy đủ không được để trống.');
      }

      // Kiểm tra balance phải là số không âm
      if (updateAccountDto.balance < 0) {
        throw new BadRequestException('balance must not be less than 0');
      }

      // 5. Lấy 4 số cuối của số tài khoản nếu chưa có
      const accountNumberLast4 = updateAccountDto.account_number_last_4 
        || updateAccountDto.account_number_full.slice(-4);

      // 6. Cập nhật thông tin tài khoản
      account.bankName = updateAccountDto.bank_name;
      account.accountType = updateAccountDto.account_type;
      account.branchName = updateAccountDto.branch_name || undefined;
      account.accountNumberFull = updateAccountDto.account_number_full;
      account.accountNumberLast4 = accountNumberLast4;
      account.balance = updateAccountDto.balance;

      const updatedAccount = await this.accountRepository.save(account);

      // 7. Trả về đối tượng tài khoản đã được cập nhật
      return {
        account_id: updatedAccount.accountId,
        user_id: updatedAccount.userId,
        bank_name: updatedAccount.bankName,
        account_type: updatedAccount.accountType,
        branch_name: updatedAccount.branchName || null,
        account_number_full: updatedAccount.accountNumberFull,
        account_number_last_4: updatedAccount.accountNumberLast4,
        balance: Number(updatedAccount.balance),
      };
    } catch (error) {
      // Nếu là NotFoundException, ForbiddenException, hoặc BadRequestException thì throw lại
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Log lỗi để debug (chỉ trong development)
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error in update account:', error);
      }

      // Các lỗi khác throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi khi lưu dữ liệu. Vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Xóa tài khoản và tất cả giao dịch liên quan
   * @param accountId - ID của tài khoản cần xóa
   * @param userId - ID của người dùng (từ JWT)
   * @returns Thông tin tài khoản đã xóa
   */
  async delete(accountId: number, userId: number) {
    // Sử dụng query runner để quản lý transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Tìm tài khoản theo accountId
      const account = await queryRunner.manager.findOne(Account, {
        where: { accountId },
      });

      // 2. Validation 1: Kiểm tra tài khoản có tồn tại không
      if (!account) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException('Account not found or not owned by current user');
      }

      // 3. Validation 2: Kiểm tra quyền sở hữu
      if (account.userId !== userId) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException('Account not found or not owned by current user');
      }

      // 4. Xóa tất cả các giao dịch liên quan đến tài khoản này
      await queryRunner.manager.delete(Transaction, { accountId });

      // 5. Xóa tài khoản
      await queryRunner.manager.delete(Account, { accountId });

      // 6. Commit transaction
      await queryRunner.commitTransaction();

      // 7. Trả về kết quả
      return {
        deleted_account_id: accountId,
      };
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await queryRunner.rollbackTransaction();

      // Nếu là NotFoundException thì throw lại
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Log lỗi để debug (chỉ trong development)
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error in delete account:', error);
      }

      // Các lỗi khác throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống, không thể xóa tài khoản và giao dịch liên quan.',
      );
    } finally {
      // Giải phóng query runner
      await queryRunner.release();
    }
  }
}
