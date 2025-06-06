'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { uploadFiles, insertDesignRequest, validateFiles } from '@/lib/supabase/db'
import { createTrelloCard } from '@/lib/mcp/trello'
import { Upload, X, FileText, Image, Archive } from 'lucide-react'

interface RequestFormData {
  project_name: string
  context: string
  design_needs: string
  key_message: string
  deadline: string
  size_format: string
  file_format_required: string
  copy_content: string
  additional_notes: string
  contact_email: string
  contact_phone: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export default function NewRequestPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)

  const form = useForm<RequestFormData>({
    defaultValues: {
      project_name: '',
      context: '',
      design_needs: '',
      key_message: '',
      deadline: '',
      size_format: '',
      file_format_required: '',
      copy_content: '',
      additional_notes: '',
      contact_email: user?.email || '',
      contact_phone: '',
      priority: 'normal'
    }
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const fileArray = Array.from(files)
    const validation = validateFiles(fileArray)

    if (!validation.valid) {
      setError(validation.error || 'File validation failed')
      return
    }

    setSelectedFiles(prev => [...prev, ...fileArray])
    setError(null)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4" />
    } else if (file.type.includes('zip')) {
      return <Archive className="w-4 h-4" />
    }
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const onSubmit = async (data: RequestFormData) => {
    try {
      setLoading(true)
      setError(null)
      setUploadProgress(0)

      if (!user) {
        throw new Error('User not authenticated')
      }

      // Upload files if any
      let uploadedFiles: any[] = []
      if (selectedFiles.length > 0) {
        setUploadProgress(25)
        uploadedFiles = await uploadFiles(selectedFiles)
        setUploadProgress(50)
      }

      // Prepare request data
      const requestData = {
        ...data,
        file_urls: uploadedFiles.map(f => f.url),
        file_names: uploadedFiles.map(f => f.name),
        file_sizes: uploadedFiles.map(f => f.size),
        request_type: 'design_request',
        submitted_via: 'web_form',
        form_version: '2.0'
      }

      // Insert into database
      setUploadProgress(75)
      const result = await insertDesignRequest(requestData)

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit request')
      }

      // Create Trello card (optional - don't fail if this errors)
      try {
        setUploadProgress(90)
        await createTrelloCard(result.data.id)
      } catch (trelloError) {
        console.warn('Trello card creation failed:', trelloError)
        // Continue anyway - the request was saved successfully
      }

      setUploadProgress(100)

      // Redirect to success page or requests list
      router.push(`/dashboard/requests?success=${result.short_id}`)

    } catch (err: any) {
      console.error('Request submission error:', err)
      setError(err.message || 'Failed to submit request')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">New Design Request</h1>
        <p className="text-muted-foreground mt-1">
          Submit a new design request with all the details we need to create amazing work
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Basic information about your design project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="project_name"
                rules={{ required: 'Project name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Company Logo Design" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="context"
                rules={{ required: 'Project context is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Context</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about your company, project, or campaign..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide background information to help us understand your needs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="design_needs"
                rules={{ required: 'Design needs are required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Design Needs</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What specific design work do you need?"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Be specific about what you want us to create
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="key_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What's the main message or feeling you want to convey?"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
              <CardDescription>
                Technical specifications and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="size_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size/Format Requirements</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 1920x1080px, A4 print, Instagram post, etc."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="file_format_required"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required File Formats</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., PNG, PDF, AI, PSD, etc."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="copy_content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Copy/Text Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any specific text, taglines, or copy that should be included..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additional_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any other details, preferences, or requirements..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Files & References</CardTitle>
              <CardDescription>
                Upload any reference materials, logos, images, or documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Images, PDFs, ZIP files up to 10MB each (50MB total)
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.zip,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>Choose Files</span>
                    </Button>
                  </label>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Selected Files</h4>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(file)}
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                How we can reach you about this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_email"
                  rules={{ 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Progress Bar */}
          {loading && uploadProgress > 0 && (
            <div className="bg-muted border rounded-lg p-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Submitting request...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}