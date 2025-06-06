import TestimonialCard from "@/components/common/TestimonialCard"
import { testimonials } from "@/data/testimonials"

export default function Testimonials() {
  const featuredTestimonials = testimonials.filter(testimonial => testimonial.featured)

  return (
    <section className="py-16 lg:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-6">
          <h2 className="scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl">
            What Our Clients Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don&apos;t just take our word for it. Here&apos;s what our satisfied clients have to say about working with DesignWorks.
          </p>
        </div>

        {/* Featured Testimonials */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {featuredTestimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>

        {/* Additional Testimonials */}
        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.filter(testimonial => !testimonial.featured).slice(0, 2).map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center space-y-8">
          <div className="flex justify-center items-center gap-8 text-[rgb(var(--muted-foreground))]">
            <div className="text-center">
              <div className="text-3xl font-bold text-[rgb(var(--heading))]">5.0</div>
              <div className="text-sm">Average Rating</div>
            </div>
            <div className="w-px h-12 bg-[rgb(var(--border))]"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[rgb(var(--heading))]">200+</div>
              <div className="text-sm">Happy Clients</div>
            </div>
            <div className="w-px h-12 bg-[rgb(var(--border))]"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[rgb(var(--heading))]">98%</div>
              <div className="text-sm">Project Success</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}