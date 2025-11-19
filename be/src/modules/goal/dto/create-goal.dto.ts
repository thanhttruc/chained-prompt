import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { GoalType } from '../goal.entity';

export class CreateGoalDto {
  @IsNotEmpty({ message: 'goal_type không được để trống' })
  @IsEnum(GoalType, { message: 'goal_type phải là Saving hoặc Expense_Limit' })
  goal_type: GoalType;

  @ValidateIf((o) => o.goal_type === GoalType.EXPENSE_LIMIT)
  @IsNotEmpty({ message: 'category_id không được để trống khi goal_type là Expense_Limit' })
  @IsNumber({}, { message: 'category_id phải là một số' })
  category_id?: number | null;

  @IsNotEmpty({ message: 'start_date không được để trống' })
  @IsDateString({}, { message: 'start_date phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  start_date: string;

  @IsNotEmpty({ message: 'end_date không được để trống' })
  @IsDateString({}, { message: 'end_date phải là định dạng ngày hợp lệ (YYYY-MM-DD)' })
  end_date: string;

  @IsNotEmpty({ message: 'target_amount không được để trống' })
  @IsNumber({}, { message: 'target_amount phải là một số' })
  @Min(0.01, { message: 'target_amount phải lớn hơn 0' })
  target_amount: number;
}

