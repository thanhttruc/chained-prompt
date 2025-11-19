import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { TransactionType, TransactionStatus } from '../transaction.entity';

export class CreateTransactionDto {
  @IsNotEmpty({ message: 'Account ID không được để trống' })
  @IsNumber({}, { message: 'Account ID phải là một số' })
  accountId: number;

  @IsNotEmpty({ message: 'Ngày giao dịch không được để trống' })
  @IsDateString({}, { message: 'Ngày giao dịch không hợp lệ' })
  transactionDate: string;

  @IsNotEmpty({ message: 'Loại giao dịch không được để trống' })
  @IsEnum(TransactionType, { message: 'Loại giao dịch phải là Revenue hoặc Expense' })
  type: TransactionType;

  @IsNotEmpty({ message: 'Mô tả giao dịch không được để trống' })
  @IsString({ message: 'Mô tả giao dịch phải là chuỗi ký tự' })
  itemDescription: string;

  @IsOptional()
  @IsNumber({}, { message: 'Category ID phải là một số' })
  category_id?: number;

  @IsOptional()
  @IsString({ message: 'Tên cửa hàng phải là chuỗi ký tự' })
  shopName?: string;

  @IsNotEmpty({ message: 'Số tiền không được để trống' })
  @IsNumber({}, { message: 'Số tiền phải là một số' })
  @Min(0.01, { message: 'Số tiền phải lớn hơn 0' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'Phương thức thanh toán phải là chuỗi ký tự' })
  paymentMethod?: string;

  @IsOptional()
  @IsEnum(TransactionStatus, { message: 'Trạng thái không hợp lệ' })
  status?: TransactionStatus;
}

