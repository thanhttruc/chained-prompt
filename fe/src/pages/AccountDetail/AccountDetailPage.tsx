import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { accountService } from '../../api/account.service'
import { AccountDetail } from '../../api/types'
import Loading from '../../components/Loading/Loading'
import Error from '../../components/Error/Error'
import { AccountEditForm } from '../../components'
import DeleteAccountModal from '../../components/DeleteAccountModal/DeleteAccountModal'
import { formatCurrency, formatDate as formatDateUtil } from '../../utils/format'

const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [accountData, setAccountData] = useState<AccountDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false)

  const fetchAccountDetails = async () => {
    if (!id) {
      setError('ID tài khoản không hợp lệ.')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const accountId = parseInt(id, 10)
      if (isNaN(accountId)) {
        setError('ID tài khoản không hợp lệ.')
        setIsLoading(false)
        return
      }

      const data = await accountService.getAccountDetail(accountId)
      setAccountData(data)
      setIsLoading(false)
    } catch (err: any) {
      setIsLoading(false)

      // Xử lý lỗi 401 - đã được xử lý bởi axios interceptor
      if (err.response?.status === 401) {
        navigate('/login')
        return
      }

      // Xử lý lỗi theo status code
      if (err.response?.status === 404) {
        setError('Không tìm thấy tài khoản này.')
      } else if (err.response?.status === 403) {
        setError('Bạn không có quyền xem thông tin tài khoản này.')
      } else {
        setError('Đã có lỗi xảy ra, không thể tải dữ liệu.')
      }
    }
  }

  useEffect(() => {
    fetchAccountDetails()
  }, [id])

  // Format date sử dụng utility function
  const formatDate = (dateString: string) => {
    return formatDateUtil(dateString)
  }

  // Format số tiền với màu sắc theo type
  // Backend đã trả về amount âm cho Expense, dương cho Revenue
  const formatAmount = (amount: number, _type: 'Revenue' | 'Expense') => {
    const isPositive = amount >= 0
    const sign = isPositive ? '+' : ''
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600'
    // formatCurrency sẽ tự động xử lý dấu âm cho số âm
    return (
      <span className={colorClass}>
        {sign}
        {formatCurrency(amount)}
      </span>
    )
  }

  // Hiển thị loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loading size="lg" message="Đang tải chi tiết tài khoản..." />
          </div>
        </div>
      </div>
    )
  }

  // Hiển thị error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <Error message={error} onRetry={fetchAccountDetails} />
          </div>
        </div>
      </div>
    )
  }

  // Handle edit success
  const handleEditSuccess = async (_updatedAccount: any) => {
    // Refresh account data
    await fetchAccountDetails()
    setIsEditing(false)
  }

  // Handle delete - open modal
  const handleDelete = () => {
    setIsDeleteModalOpen(true)
  }

  // Handle delete success - navigate to accounts list
  const handleDeleteSuccess = () => {
    navigate('/accounts')
  }

  // Hiển thị nội dung chính
  if (!accountData) {
    return null
  }

  // Hiển thị form chỉnh sửa nếu đang ở chế độ edit
  if (isEditing) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header với nút back */}
          <div className="mb-6">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 text-[#299D91] hover:text-[#238a7f] transition-colors mb-4"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-base font-medium leading-6">Quay lại chi tiết tài khoản</span>
            </button>
          </div>

          <AccountEditForm
            accountId={parseInt(id || '0', 10)}
            accountData={accountData}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header với nút back */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/accounts')}
            className="flex items-center gap-2 text-[#299D91] hover:text-[#238a7f] transition-colors mb-4"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-base font-medium leading-6">Quay lại danh sách tài khoản</span>
          </button>
        </div>

        {/* Card thông tin tài khoản */}
        <div className="bg-white rounded-lg shadow-[0px_20px_25px_0px_rgba(76,103,100,0.1)] p-6 mb-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[rgba(210,210,210,0.25)]">
              <h2 className="text-xl font-bold leading-7 text-[#191919]">{accountData.bank_name}</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium leading-5 text-[#666666] uppercase">
                  {accountData.account_type}
                </span>
                {/* Buttons Chỉnh sửa và Xóa */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-[#299D91] text-white rounded-md hover:bg-[#238a7f] transition-colors text-sm font-medium"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>

            {/* Thông tin chi tiết */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Số dư */}
              <div className="flex flex-col gap-1">
                <p className="text-sm font-normal leading-5 text-[#9F9F9F]">Số dư hiện tại</p>
                <p className="text-2xl font-semibold leading-8 text-[#191919]">
                  {formatCurrency(accountData.balance)}
                </p>
              </div>

              {/* Loại tài khoản */}
              <div className="flex flex-col gap-1">
                <p className="text-sm font-normal leading-5 text-[#9F9F9F]">Loại tài khoản</p>
                <p className="text-lg font-semibold leading-7 text-[#191919] uppercase">
                  {accountData.account_type}
                </p>
              </div>

              {/* Tên chi nhánh */}
              {accountData.branch_name && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-normal leading-5 text-[#9F9F9F]">Tên chi nhánh</p>
                  <p className="text-lg font-semibold leading-7 text-[#191919]">
                    {accountData.branch_name}
                  </p>
                </div>
              )}

              {/* Số tài khoản đầy đủ */}
              <div className="flex flex-col gap-1">
                <p className="text-sm font-normal leading-5 text-[#9F9F9F]">Số tài khoản</p>
                <p className="text-lg font-semibold leading-7 text-[#191919]">
                  {accountData.account_number_full}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng giao dịch gần đây */}
        <div className="bg-white rounded-lg shadow-[0px_20px_25px_0px_rgba(76,103,100,0.1)] p-6">
          <h3 className="text-xl font-bold leading-7 text-[#191919] mb-6">Giao dịch gần đây</h3>

          {/* Kiểm tra nếu không có giao dịch */}
          {accountData.recent_transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base font-normal leading-6 text-[#9F9F9F]">
                Chưa có giao dịch nào được ghi nhận cho tài khoản này.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(210,210,210,0.25)]">
                    <th className="text-left py-3 px-4 text-sm font-semibold leading-5 text-[#878787] uppercase">
                      Ngày
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold leading-5 text-[#878787] uppercase">
                      Mô tả
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold leading-5 text-[#878787] uppercase">
                      Số tiền
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold leading-5 text-[#878787] uppercase">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accountData.recent_transactions.map((transaction, index) => (
                    <tr
                      key={index}
                      className="border-b border-[rgba(210,210,210,0.25)] last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4 text-sm font-normal leading-5 text-[#191919]">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="py-4 px-4 text-sm font-normal leading-5 text-[#191919]">
                        {transaction.description}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold leading-5 text-right">
                        {formatAmount(transaction.amount, transaction.type)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium leading-4 ${
                            transaction.status === 'Complete'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transaction.status === 'Complete'
                            ? 'Hoàn thành'
                            : transaction.status === 'Pending'
                            ? 'Đang xử lý'
                            : 'Thất bại'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {accountData && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          accountId={accountData.id}
          accountName={accountData.bank_name}
          accountNumberLast4={accountData.account_number_full.slice(-4)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}

export default AccountDetailPage

