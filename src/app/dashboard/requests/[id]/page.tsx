'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  User,
  Phone,
  Mail,
  MessageSquare,
  Flag
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
  file_sizes: number[]
  context: string
  design_needs: string
  key_message: string
  size_format: string
  file_format_required: string
  copy_content: string
  additional_notes: string
  contact_email: string
  contact_phone: string
  sync_status: string
  last_sync_at: string | null
}

export default function RequestDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [request, setRequest] = useState<DesignRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRequest() {
      try {
        if (!user || !params.id) return

        const { data, error } = await supabase
          .from('design_requests')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id) // Ensure user can only see their own requests
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            setError('Request not found')
          } else {
            setError('Failed to load request')
          }
          console.error('Error loading request:', error)
          return
        }

        setRequest(data)
      } catch (error) {
        console.error('Request detail error:', error)
        setError('Failed to load request')
      } finally {
        setLoading(false)
      }
    }

    loadRequest()
  }, [user, params.id])

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
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200'
      default:
        return 'bg-muted text-foreground border'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'normal':
        return 'bg-muted text-foreground border'
      case 'low':
        return 'bg-muted text-muted-foreground border'
      default:
        return 'bg-muted text-foreground border'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Request Not Found</h1>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{error}</h3>
            <p className="text-muted-foreground mb-6">
              The request you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link href="/dashboard/requests">
              <Button>View All Requests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {request.project_name || `Request ${request.short_id}`}
          </h1>
          <p className="text-muted-foreground mt-1">
            Request ID: {request.short_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getPriorityColor(request.priority)}>
            <Flag className="w-3 h-3 mr-1" />
            {request.priority}
          </Badge>
          <Badge variant="outline" className={getStatusColor(request.status)}>
            {getStatusIcon(request.status)}
            <span className="ml-1">{request.status.replace('_', ' ')}</span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.context && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Context</h4>
                  <p className="text-foreground whitespace-pre-wrap">{request.context}</p>
                </div>
              )}

              {request.design_needs && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Design Needs</h4>
                  <p className="text-foreground whitespace-pre-wrap">{request.design_needs}</p>
                </div>
              )}

              {request.key_message && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Key Message</h4>
                  <p className="text-foreground whitespace-pre-wrap">{request.key_message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {request.size_format && (
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Size/Format</h4>
                    <p className="text-foreground">{request.size_format}</p>
                  </div>
                )}

                {request.file_format_required && (
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Required Formats</h4>
                    <p className="text-foreground">{request.file_format_required}</p>
                  </div>
                )}
              </div>

              {request.copy_content && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Copy/Text Content</h4>
                  <p className="text-foreground whitespace-pre-wrap">{request.copy_content}</p>
                </div>
              )}

              {request.additional_notes && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Additional Notes</h4>
                  <p className="text-foreground whitespace-pre-wrap">{request.additional_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Files */}
          {request.file_urls && request.file_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attached Files</CardTitle>
                <CardDescription>
                  {request.file_urls.length} file(s) attached to this request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.file_urls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {request.file_names?.[index] || `File ${index + 1}`}
                          </p>
                          {request.file_sizes?.[index] && (
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(request.file_sizes[index])}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {request.deadline && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Deadline</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {request.last_sync_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="font-medium">Last Synced</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.last_sync_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{request.contact_email}</p>
                </div>
              </div>

              {request.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{request.contact_phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.trello_card_url && (
                <a
                  href={request.trello_card_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View in Trello
                  </Button>
                </a>
              )}

              <Button variant="outline" className="w-full gap-2" disabled>
                <MessageSquare className="w-4 h-4" />
                Add Comment
                <span className="text-xs text-muted-foreground">(Coming Soon)</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}