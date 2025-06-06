"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { DesignWorksButton } from '@/components/common/Button'

type FormData = {
  firstName: string
  lastName: string
  email: string
  projectType: string
  message: string
}

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // For now, just log the data
      console.log('Form submitted:', data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSubmitStatus('success')
      reset()
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-heading mb-2">
            First Name
          </label>
          <input 
            type="text" 
            {...register('firstName', { required: 'First name is required' })}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#BFF747] focus:border-transparent outline-none transition-all duration-300 ${
              errors.firstName ? 'border-red-500' : 'border'
            }`}
            placeholder="Your first name"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-heading mb-2">
            Last Name
          </label>
          <input 
            type="text" 
            {...register('lastName', { required: 'Last name is required' })}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#BFF747] focus:border-transparent outline-none transition-all duration-300 ${
              errors.lastName ? 'border-red-500' : 'border'
            }`}
            placeholder="Your last name"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-heading mb-2">
          Email Address
        </label>
        <input 
          type="email" 
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#BFF747] focus:border-transparent outline-none transition-all duration-300 ${
            errors.email ? 'border-red-500' : 'border'
          }`}
          placeholder="your@email.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-heading mb-2">
          Project Type
        </label>
        <select 
          {...register('projectType', { required: 'Please select a project type' })}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#BFF747] focus:border-transparent outline-none transition-all duration-300 ${
            errors.projectType ? 'border-red-500' : 'border'
          }`}
        >
          <option value="">Select a service</option>
          <option value="brand-identity">Brand Identity Design</option>
          <option value="web-design">Web Design & Development</option>
          <option value="digital-marketing">Digital Marketing Design</option>
          <option value="print-design">Print Design Services</option>
          <option value="ui-ux">UI/UX Design</option>
          <option value="consultation">Consultation & Strategy</option>
        </select>
        {errors.projectType && (
          <p className="mt-1 text-sm text-destructive">{errors.projectType.message}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-heading mb-2">
          Project Details
        </label>
        <textarea 
          rows={4}
          {...register('message', { 
            required: 'Please tell us about your project',
            minLength: {
              value: 10,
              message: 'Message must be at least 10 characters'
            }
          })}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#BFF747] focus:border-transparent outline-none transition-all duration-300 resize-none ${
            errors.message ? 'border-red-500' : 'border'
          }`}
          placeholder="Tell us about your project requirements..."
        />
        {errors.message && (
          <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      {/* Status Messages */}
      {submitStatus === 'success' && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg">
          Thank you for your message! We&apos;ll get back to you soon.
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          There was an error submitting your form. Please try again.
        </div>
      )}
      
      <div className="pt-4">
        <DesignWorksButton 
          type="submit"
          variant="default" 
          size="default" 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </DesignWorksButton>
      </div>
    </form>
  )
}