import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../Input/Input'
import Button from '../Button/Button'
import Toast from '../Toast/Toast'
import { transactionService } from '../../api/transaction.service'
import { accountService } from '../../api/account.service'
import { categoryService } from '../../api/category.service'
import type { Account, Category } from '../../api/types'
import { useToast } from '../../hooks/useToast'

interface AddTransactionFormProps {
  onSuccess?: () => void
}

const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  // Form state
  const [itemDescription, setItemDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<'Revenue' | 'Expense'>('Expense')
  const [accountId, setAccountId] = useState<string>('')
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [shopName, setShopName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Error state
  const [errors, setErrors] = useState<{
    itemDescription?: string
    categoryId?: string
    amount?: string
    accountId?: string
    general?: string
  }>({})

  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Load accounts and categories on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true)
        const [accountsResponse, categoriesResponse] = await Promise.all([
          accountService.getAccounts(),
          categoryService.getCategories(),
        ])

        if (accountsResponse.success && accountsResponse.data) {
          // Transform account data to match Account type
          // Response structure: { success: true, data: { user_id, accounts: [...] } }
          const accountsArray = accountsResponse.data.accounts || []
          const accountData = accountsArray.map((acc: any) => ({
            account_id: acc.id || acc.account_id,
            user_id: accountsResponse.data.user_id,
            bank_name: acc.bank_name,
            account_type: acc.account_type,
            branch_name: acc.branch_name,
            account_number_full: acc.account_number_full,
            account_number_last_4: acc.account_number_last_4,
            balance: acc.balance,
          }))
          setAccounts(accountData)
        }

        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        showToast('Không thể tải dữ liệu. Vui lòng thử lại sau.', 'error')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [showToast])

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!itemDescription.trim()) {
      newErrors.itemDescription = 'Tên giao dịch không được để trống'
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Số tiền phải là một số và lớn hơn 0'
    }

    if (!categoryId) {
      newErrors.categoryId = 'Vui lòng chọn danh mục'
    }

    if (!accountId) {
      newErrors.accountId = 'Vui lòng chọn tài khoản thanh toán'
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
      // Prepare payload
      const payload = {
        accountId: parseInt(accountId),
        transactionDate: new Date(transactionDate).toISOString(),
        type: type,
        itemDescription: itemDescription.trim(),
        category_id: parseInt(categoryId),
        amount: parseFloat(amount),
        shopName: shopName.trim() || undefined,
        paymentMethod: paymentMethod.trim() || undefined,
        status: 'Complete' as const,
      }

      const response = await transactionService.createTransaction(payload)

      // Success handling
      // 1. Show toast notification
      showToast('Thêm giao dịch thành công.', 'success')

      // 2. Reset form state
      setItemDescription('')
      setCategoryId('')
      setAmount('')
      setType('Expense')
      setAccountId('')
      setTransactionDate(new Date().toISOString().split('T')[0])
      setShopName('')
      setPaymentMethod('')

      // 3. Navigate to transactions page after a short delay
      setTimeout(() => {
        navigate('/transactions')
        if (onSuccess) {
          onSuccess()
        }
      }, 1500)
    } catch (error: any) {
      setIsLoading(false)

      // Handle different error types
      if (error.response) {
        const status = error.response.status

        if (status === 400 || status === 500) {
          showToast('Không thể thêm giao dịch lúc này. Vui lòng thử lại sau.', 'error')
        } else {
          showToast('Đã xảy ra lỗi. Vui lòng thử lại sau.', 'error')
        }
      } else {
        showToast('Không thể thêm giao dịch lúc này. Vui lòng thử lại sau.', 'error')
      }
    }
  }

  if (isLoadingData) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Thêm Giao Dịch Mới
      </h2>

      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Name / Item Description */}
        <Input
          label="Tên giao dịch"
          type="text"
          value={itemDescription}
          onChange={(e) => setItemDescription(e.target.value)}
          error={errors.itemDescription}
          placeholder="Ví dụ: Movie Ticket"
          required
        />

        {/* Category */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Danh mục <span className="text-red-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`
              w-full px-4 py-2 border rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              dark:bg-gray-700 dark:border-gray-600 dark:text-white
              ${errors.categoryId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            `}
            required
          >
            <option value="">-- Chọn danh mục --</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.categoryId}</p>
          )}
        </div>

        {/* Amount */}
        <Input
          label="Số tiền"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          placeholder="0"
          min="0.01"
          step="0.01"
          required
        />

        {/* Transaction Type */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Loại giao dịch
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="Revenue"
                checked={type === 'Revenue'}
                onChange={(e) => setType(e.target.value as 'Revenue' | 'Expense')}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">Thu nhập (Revenue)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="Expense"
                checked={type === 'Expense'}
                onChange={(e) => setType(e.target.value as 'Revenue' | 'Expense')}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">Chi tiêu (Expense)</span>
            </label>
          </div>
        </div>

        {/* Payment Account */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tài khoản thanh toán <span className="text-red-500">*</span>
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={`
              w-full px-4 py-2 border rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              dark:bg-gray-700 dark:border-gray-600 dark:text-white
              ${errors.accountId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            `}
            required
          >
            <option value="">-- Chọn tài khoản --</option>
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.bank_name} - {account.account_type} ({account.account_number_last_4}) -{' '}
                {account.balance.toLocaleString('vi-VN')} VNĐ
              </option>
            ))}
          </select>
          {errors.accountId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountId}</p>
          )}
        </div>

        {/* Transaction Date */}
        <Input
          label="Ngày giao dịch"
          type="date"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required
        />

        {/* Shop Name (Optional) */}
        <Input
          label="Tên cửa hàng (Tùy chọn)"
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="Ví dụ: Inox"
        />

        {/* Payment Method (Optional) */}
        <Input
          label="Phương thức thanh toán (Tùy chọn)"
          type="text"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          placeholder="Ví dụ: Credit Card"
        />

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/transactions')}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Lưu
          </Button>
        </div>
      </form>

      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  )
}

export default AddTransactionForm

