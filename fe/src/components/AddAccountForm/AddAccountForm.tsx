import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../Input/Input'
import Button from '../Button/Button'
import Toast from '../Toast/Toast'
import { accountService } from '../../api/account.service'
import type { AccountType } from '../../api/types'
import { useToast } from '../../hooks/useToast'

interface AddAccountFormProps {
  onSuccess?: () => void
}

const AddAccountForm: React.FC<AddAccountFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()
  
  // Form state
  const [bankName, setBankName] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('Checking')
  const [branchName, setBranchName] = useState('')
  const [accountNumberFull, setAccountNumberFull] = useState('')
  const [balance, setBalance] = useState<string>('')

  // Error state
  const [errors, setErrors] = useState<{
    bank_name?: string
    account_type?: string
    branch_name?: string
    account_number_full?: string
    balance?: string
    general?: string
  }>({})

  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!bankName.trim()) {
      newErrors.bank_name = 'Tên ngân hàng không được để trống'
    }

    if (!accountNumberFull.trim()) {
      newErrors.account_number_full = 'Số tài khoản không được để trống'
    }

    const balanceNum = parseFloat(balance)
    if (isNaN(balanceNum) || balanceNum < 0) {
      newErrors.balance = 'Số dư phải là một số và không được âm'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setErrors({})

    // Client-side validation
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await accountService.createAccount({
        bank_name: bankName.trim(),
        account_type: accountType,
        branch_name: branchName.trim() || undefined,
        account_number_full: accountNumberFull.trim(),
        balance: parseFloat(balance),
      })

      // Success handling
      // 1. Show toast notification
      showToast('Thêm tài khoản thành công', 'success')

      // 2. Navigate to accounts list after a short delay to show toast
      setTimeout(() => {
        navigate('/accounts')
        // 3. Call onSuccess callback if provided (for state update)
        if (onSuccess) {
          onSuccess()
        }
      }, 1500)
    } catch (error: any) {
      setIsLoading(false)

      // Handle different error types
      if (error.response) {
        const status = error.response.status
        const errorData = error.response.data

        if (status === 409) {
          setErrors({
            general: 'Tài khoản này đã tồn tại trong danh sách của bạn.',
          })
        } else if (status === 500) {
          setErrors({
            general: 'Không thể thêm tài khoản lúc này. Vui lòng thử lại sau.',
          })
        } else if (status === 400) {
          // Validation errors from backend
          const validationErrors: typeof errors = {}
          if (errorData.message) {
            if (Array.isArray(errorData.message)) {
              errorData.message.forEach((msg: string) => {
                if (msg.includes('bank_name') || msg.includes('ngân hàng')) {
                  validationErrors.bank_name = msg
                } else if (msg.includes('account_number_full') || msg.includes('tài khoản')) {
                  validationErrors.account_number_full = msg
                } else if (msg.includes('balance') || msg.includes('số dư')) {
                  validationErrors.balance = msg
                }
              })
            } else {
              validationErrors.general = errorData.message
            }
          }
          setErrors(validationErrors)
        } else {
          setErrors({
            general: errorData.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
          })
        }
      } else {
        setErrors({
          general: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
        })
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Thêm Tài Khoản Mới
      </h2>

      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bank Name */}
        <Input
          label="Ngân hàng"
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          error={errors.bank_name}
          placeholder="Ví dụ: TPBank"
          required
        />

        {/* Account Type */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Loại tài khoản
          </label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            className={`
              w-full px-4 py-2 border rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              dark:bg-gray-700 dark:border-gray-600 dark:text-white
              ${errors.account_type ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            `}
            required
          >
            <option value="Checking">Checking</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Savings">Savings</option>
            <option value="Investment">Investment</option>
            <option value="Loan">Loan</option>
          </select>
          {errors.account_type && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.account_type}</p>
          )}
        </div>

        {/* Branch Name */}
        <Input
          label="Chi nhánh (Tùy chọn)"
          type="text"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          error={errors.branch_name}
          placeholder="Ví dụ: Quận 4"
        />

        {/* Account Number Full */}
        <Input
          label="Số tài khoản đầy đủ"
          type="text"
          value={accountNumberFull}
          onChange={(e) => setAccountNumberFull(e.target.value)}
          error={errors.account_number_full}
          placeholder="Ví dụ: 9704221122334455667"
          required
        />

        {/* Balance */}
        <Input
          label="Số dư khởi tạo"
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          error={errors.balance}
          placeholder="0"
          min="0"
          step="0.01"
          required
        />

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/accounts')}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Thêm tài khoản
          </Button>
        </div>
      </form>

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  )
}

export default AddAccountForm

