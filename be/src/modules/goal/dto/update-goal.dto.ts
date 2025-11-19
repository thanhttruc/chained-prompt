import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateGoalDto {
  @IsNotEmpty({ message: 'target_amount không được để trống' })
  @IsNumber({}, { message: 'target_amount phải là một số' })
  @Min(0.01, { message: 'target_amount must be a positive number' })
  target_amount: number;
}

