'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface RequestStats {
  total: number
  pending: number
  in_progress: number
  completed: number
}

interface RecentRequest {
  id: string
  short_id: string
  project_name: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<RequestStats>({ total: 0, pending: 0, in_progress: 0, completed: 0 })
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (!user) return

        // Get request stats
        const { data: requests, error: requestsError } = await supabase
          .from('design_requests')
          .select('status')
          .eq('user_id', user.id)

        if (requestsError) {
          console.error('Error loading requests:', requestsError)
          return
        }

        // Calculate stats
        const statsData = requests?.reduce((acc, request) => {
          acc.total++
          if (request.status === 'pending') acc.pending++
          else if (request.status === 'in_progress') acc.in_progress++
          else if (request.status === 'completed') acc.completed++
          return acc
        }, { total: 0, pending: 0, in_progress: 0, completed: 0 }) || { total: 0, pending: 0, in_progress: 0, completed: 0 }

        setStats(statsData)

        // Get recent requests
        const { data: recent, error: recentError } = await supabase
          .from('design_requests')
          .select('id, short_id, project_name, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (recentError) {
          console.error('Error loading recent requests:', recentError)
          return
        }

        setRecentRequests(recent || [])

      } catch (error) {
        console.error('Dashboard error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50'
      case 'completed':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your design requests and track progress
          </p>
        </div>
        <Link href="/dashboard/new-request">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>
              Your latest design submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground">No requests yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Submit your first design request to get started
                </p>
                <Link href="/dashboard/new-request">
                  <Button size="sm">
                    Create Request
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <p className="font-medium">
                          {request.project_name || request.short_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.short_id} • {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
                
                <div className="pt-3 border-t">
                  <Link href="/dashboard/requests">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Requests
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/new-request">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Plus className="w-4 h-4" />
                Submit New Request
              </Button>
            </Link>
            
            <Link href="/dashboard/requests">
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText className="w-4 h-4" />
                View All Requests
              </Button>
            </Link>
            
            <Link href="/dashboard/profile">
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText className="w-4 h-4" />
                Update Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}