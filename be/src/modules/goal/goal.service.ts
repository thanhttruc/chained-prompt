import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Goal, GoalType } from './goal.entity';
import { Transaction, TransactionType } from '../transaction/transaction.entity';
import { Account } from '../account/account.entity';
import { Category } from '../category/category.entity';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateGoalDto } from './dto/create-goal.dto';

@Injectable()
export class GoalService {
  constructor(
    @InjectRepository(Goal)
    private goalRepository: Repository<Goal>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Lấy mục tiêu tiết kiệm và mục tiêu chi tiêu của người dùng
   * @param userId - ID của người dùng (từ JWT)
   * @returns Dữ liệu mục tiêu bao gồm savingGoal và expenseGoals
   */
  async getGoals(userId: number) {
    try {
      // 1. Lấy mục tiêu tiết kiệm (Saving)
      const savingGoal = await this.goalRepository.findOne({
        where: {
          userId,
          goalType: GoalType.SAVING,
        },
        relations: ['category'],
      });

      // 2. Lấy tháng hiện tại (đầu tháng và cuối tháng)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // 3. Lấy các mục tiêu chi tiêu (Expense_Limit) có thời gian bao gồm tháng hiện tại
      const allExpenseGoals = await this.goalRepository.find({
        where: {
          userId,
          goalType: GoalType.EXPENSE_LIMIT,
        },
        relations: ['category'],
      });

      // Lọc các mục tiêu có start_date <= cuối tháng hiện tại và end_date >= đầu tháng hiện tại
      const expenseGoals = allExpenseGoals.filter((goal) => {
        const goalStartDate = goal.startDate instanceof Date 
          ? goal.startDate 
          : new Date(goal.startDate);
        const goalEndDate = goal.endDate instanceof Date 
          ? goal.endDate 
          : new Date(goal.endDate);
        
        // Mục tiêu có hiệu lực trong tháng hiện tại nếu:
        // start_date <= endOfMonth AND end_date >= startOfMonth
        return goalStartDate <= endOfMonth && goalEndDate >= startOfMonth;
      });

      // 4. Tính toán target_achieved cho savingGoal nếu có
      let targetAchieved = 0;
      if (savingGoal) {
        // Lấy danh sách account_id của user
        const accounts = await this.accountRepository.find({
          where: { userId },
          select: ['accountId'],
        });

        if (accounts.length > 0) {
          const accountIds = accounts.map((acc) => acc.accountId);

          // Tính tổng thu nhập (Revenue) trong tháng hiện tại
          const revenueResult = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('COALESCE(SUM(transaction.amount), 0)', 'total')
            .where('transaction.accountId IN (:...accountIds)', { accountIds })
            .andWhere('transaction.type = :type', { type: TransactionType.REVENUE })
            .andWhere('transaction.transactionDate >= :startDate', { startDate: startOfMonth })
            .andWhere('transaction.transactionDate <= :endDate', { endDate: endOfMonth })
            .getRawOne();

          const totalRevenue = parseFloat(revenueResult?.total || '0') || 0;

          // Tính tổng chi tiêu (Expense) trong tháng hiện tại
          const expenseResult = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('COALESCE(SUM(transaction.amount), 0)', 'total')
            .where('transaction.accountId IN (:...accountIds)', { accountIds })
            .andWhere('transaction.type = :type', { type: TransactionType.EXPENSE })
            .andWhere('transaction.transactionDate >= :startDate', { startDate: startOfMonth })
            .andWhere('transaction.transactionDate <= :endDate', { endDate: endOfMonth })
            .getRawOne();

          const totalExpense = parseFloat(expenseResult?.total || '0') || 0;

          // Tính target_achieved = Tổng Thu Nhập - Tổng Chi Tiêu
          targetAchieved = totalRevenue - totalExpense;
        }
      }

      // 5. Lấy danh sách account_id của user để tính chi tiêu theo category
      const accounts = await this.accountRepository.find({
        where: { userId },
        select: ['accountId'],
      });

      const accountIds = accounts.length > 0 ? accounts.map((acc) => acc.accountId) : [];

      // 6. Format response cho savingGoal
      const savingGoalResponse = savingGoal
        ? {
            goal_id: savingGoal.goalId,
            goal_type: savingGoal.goalType,
            target_amount: Number(savingGoal.targetAmount),
            target_achieved: targetAchieved,
            start_date: savingGoal.startDate instanceof Date
              ? savingGoal.startDate.toISOString().split('T')[0]
              : String(savingGoal.startDate).split('T')[0],
            end_date: savingGoal.endDate instanceof Date
              ? savingGoal.endDate.toISOString().split('T')[0]
              : String(savingGoal.endDate).split('T')[0],
          }
        : null;

      // 7. Format response cho expenseGoals và tính số tiền đã chi tiêu trong tháng hiện tại
      const expenseGoalsResponse = await Promise.all(
        expenseGoals.map(async (goal) => {
          let currentExpense = 0;

          // Tính số tiền đã chi tiêu trong tháng hiện tại cho category này
          if (accountIds.length > 0 && goal.categoryId) {
            const expenseResult = await this.transactionRepository
              .createQueryBuilder('transaction')
              .select('COALESCE(SUM(transaction.amount), 0)', 'total')
              .where('transaction.accountId IN (:...accountIds)', { accountIds })
              .andWhere('transaction.type = :type', { type: TransactionType.EXPENSE })
              .andWhere('transaction.categoryId = :categoryId', { categoryId: goal.categoryId })
              .andWhere('transaction.transactionDate >= :startDate', { startDate: startOfMonth })
              .andWhere('transaction.transactionDate <= :endDate', { endDate: endOfMonth })
              .getRawOne();

            currentExpense = parseFloat(expenseResult?.total || '0') || 0;
          }

          return {
            goal_id: goal.goalId,
            category: goal.category?.categoryName || 'Unknown',
            target_amount: Number(goal.targetAmount),
            current_expense: currentExpense,
          };
        }),
      );

      return {
        savingGoal: savingGoalResponse,
        expenseGoals: expenseGoalsResponse,
      };
    } catch (error) {
      // Xử lý lỗi và throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi tải mục tiêu, vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Tạo mục tiêu mới
   * @param userId - ID của người dùng (từ JWT)
   * @param createGoalDto - DTO chứa thông tin mục tiêu
   * @returns Goal vừa được tạo
   */
  async createGoal(userId: number, createGoalDto: CreateGoalDto) {
    try {
      // 1. Validation: target_amount phải lớn hơn 0
      if (!createGoalDto.target_amount || createGoalDto.target_amount <= 0) {
        throw new BadRequestException('target_amount phải lớn hơn 0.');
      }

      // 2. Validation: end_date phải sau start_date
      const startDate = new Date(createGoalDto.start_date);
      const endDate = new Date(createGoalDto.end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('start_date và end_date phải là định dạng ngày hợp lệ.');
      }

      if (endDate <= startDate) {
        throw new BadRequestException('end_date phải sau start_date.');
      }

      // 3. Validation: Nếu goal_type là Expense_Limit, category_id không được null và phải là danh mục hợp lệ
      if (createGoalDto.goal_type === GoalType.EXPENSE_LIMIT) {
        if (!createGoalDto.category_id) {
          throw new BadRequestException('category_id không được để trống khi goal_type là Expense_Limit.');
        }

        // Kiểm tra category có tồn tại không
        const category = await this.categoryRepository.findOne({
          where: { categoryId: createGoalDto.category_id },
        });

        if (!category) {
          throw new BadRequestException('category_id không hợp lệ. Danh mục không tồn tại.');
        }
      }

      // 4. Tạo bản ghi mới trong bảng Goals
      const newGoal = this.goalRepository.create({
        userId,
        goalType: createGoalDto.goal_type,
        categoryId: createGoalDto.goal_type === GoalType.EXPENSE_LIMIT ? createGoalDto.category_id : null,
        startDate,
        endDate,
        targetAmount: createGoalDto.target_amount,
      });

      // 5. Lưu bản ghi vào database
      const savedGoal = await this.goalRepository.save(newGoal);

      return savedGoal;
    } catch (error) {
      // Nếu đã là BadRequestException, throw lại
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Nếu có lỗi khi lưu vào database, throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Không thể tạo mục tiêu lúc này. Vui lòng thử lại sau.',
      );
    }
  }

  /**
   * Cập nhật target_amount của mục tiêu
   * @param goalId - ID của mục tiêu cần cập nhật
   * @param userId - ID của người dùng (từ JWT)
   * @param updateGoalDto - DTO chứa target_amount mới
   * @returns Goal đã được cập nhật
   */
  async updateGoal(goalId: number, userId: number, updateGoalDto: UpdateGoalDto) {
    try {
      // 1. Tìm mục tiêu trong database bằng goalId
      const goal = await this.goalRepository.findOne({
        where: { goalId },
      });

      // 2. Nếu không tìm thấy, throw NotFoundException
      if (!goal) {
        throw new NotFoundException('Mục tiêu không tồn tại.');
      }

      // 3. Xác thực quyền sở hữu: So sánh goal.userId với userId từ token
      if (goal.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền chỉnh sửa mục tiêu này.');
      }

      // 4. Validation nghiệp vụ đã được thực hiện bởi class-validator trong DTO
      // (target_amount phải là số dương > 0)

      // 5. Cập nhật trường target_amount của mục tiêu trong database
      goal.targetAmount = updateGoalDto.target_amount;
      const updatedGoal = await this.goalRepository.save(goal);

      // 6. Trả về goal đã được cập nhật
      return updatedGoal;
    } catch (error) {
      // Nếu đã là HttpException (NotFoundException, ForbiddenException), throw lại
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      // Nếu có lỗi khi cập nhật database, throw InternalServerErrorException
      throw new InternalServerErrorException(
        'Không thể lưu thay đổi lúc này. Vui lòng thử lại sau.',
      );
    }
  }
}

