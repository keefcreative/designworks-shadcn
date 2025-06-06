'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search,
  Calendar,
  ExternalLink,
  Download,
  Eye
} from 'lucide-react'

interface DesignRequest {
  id: string
  short_id: string
  project_name: string
  status: string
  priority: string
  created_at: string
  deadline: string | null
  trello_card_url: string | null
  file_urls: string[]
  file_names: string[]
  context: string
  design_needs: string
}

export default function RequestsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<DesignRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    // Check for success message
    const success = searchParams.get('success')
    if (success) {
      setSuccessMessage(`Request ${success} submitted successfully!`)
      // Clear the success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000)
    }
  }, [searchParams])

  useEffect(() => {
    async function loadRequests() {
      try {
        if (!user) return

        const { data, error } = await supabase
          .from('design_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading requests:', error)
          return
        }

        setRequests(data || [])
      } catch (error) {
        console.error('Requests error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [user])

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
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-muted-foreground bg-muted border'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'normal':
        return 'text-muted-foreground bg-muted border'
      case 'low':
        return 'text-muted-foreground bg-muted border'
      default:
        return 'text-muted-foreground bg-muted border'
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.short_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Requests</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all your design requests
          </p>
        </div>
        <Link href="/dashboard/new-request">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-600 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            {requests.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No requests yet</h3>
                <p className="text-muted-foreground mb-6">
                  Submit your first design request to get started
                </p>
                <Link href="/dashboard/new-request">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Request
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No matching requests</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {request.project_name || `Request ${request.short_id}`}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span>{request.short_id}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                      {request.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due: {new Date(request.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{request.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Description */}
                  {request.context && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Context</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.context}
                      </p>
                    </div>
                  )}

                  {/* Design Needs */}
                  {request.design_needs && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Design Needs</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.design_needs}
                      </p>
                    </div>
                  )}

                  {/* Files */}
                  {request.file_urls && request.file_urls.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Attached Files ({request.file_urls.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {request.file_urls.slice(0, 3).map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 rounded text-xs text-muted-foreground transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            {request.file_names?.[index] || `File ${index + 1}`}
                          </a>
                        ))}
                        {request.file_urls.length > 3 && (
                          <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                            +{request.file_urls.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Link href={`/dashboard/requests/${request.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="w-3 h-3" />
                        View Details
                      </Button>
                    </Link>
                    
                    {request.trello_card_url && (
                      <a
                        href={request.trello_card_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="gap-1">
                          <ExternalLink className="w-3 h-3" />
                          View in Trello
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}