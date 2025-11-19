import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { AccountType } from '../account.entity';

export class CreateAccountDto {
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  @IsString({ message: 'Tên ngân hàng phải là chuỗi ký tự' })
  bank_name: string;

  @IsNotEmpty({ message: 'Loại tài khoản không được để trống' })
  @IsEnum(AccountType, { message: 'Loại tài khoản không hợp lệ' })
  account_type: AccountType;

  @IsOptional()
  @IsString({ message: 'Tên chi nhánh phải là chuỗi ký tự' })
  branch_name?: string;

  @IsNotEmpty({ message: 'Số tài khoản đầy đủ không được để trống' })
  @IsString({ message: 'Số tài khoản đầy đủ phải là chuỗi ký tự' })
  account_number_full: string;

  @IsNumber({}, { message: 'Số dư phải là một số' })
  @Min(0, { message: 'Số dư phải lớn hơn hoặc bằng 0' })
  balance: number;
}

