import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/Layout/Layout'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading/Loading'

// Lazy load pages
const Home = React.lazy(() => import('../pages/Home/Home'))
const Login = React.lazy(() => import('../pages/Login/Login'))
const Register = React.lazy(() => import('../pages/Register/Register'))
const Dashboard = React.lazy(() => import('../pages/Dashboard/Dashboard'))
const AccountListPage = React.lazy(() => import('../pages/AccountList/AccountListPage'))
const AccountDetailPage = React.lazy(() => import('../pages/AccountDetail/AccountDetailPage'))
const AddAccountPage = React.lazy(() => import('../pages/AddAccount/AddAccountPage'))
const TransactionsPage = React.lazy(() => import('../pages/Transactions/TransactionsPage'))
const AddTransactionPage = React.lazy(() => import('../pages/AddTransaction/AddTransactionPage'))
const BillsPage = React.lazy(() => import('../pages/Bills/BillsPage'))
const ExpensesPage = React.lazy(() => import('../pages/Expenses/ExpensesPage'))
const GoalsPage = React.lazy(() => import('../pages/Goals/GoalsPage'))

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <React.Suspense fallback={<Loading fullScreen message="Đang tải trang..." />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <AccountListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/:id"
              element={
                <ProtectedRoute>
                  <AccountDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/add"
              element={
                <ProtectedRoute>
                  <AddAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <TransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions/add"
              element={
                <ProtectedRoute>
                  <AddTransactionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bills"
              element={
                <ProtectedRoute>
                  <BillsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <ExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <GoalsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Layout>
    </BrowserRouter>
  )
}

export default AppRouter

