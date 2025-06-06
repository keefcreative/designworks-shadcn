import { Card, CardContent } from "@/components/ui/card"
import { Testimonial } from "@/data/testimonials"

interface TestimonialCardProps {
  testimonial: Testimonial
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <Card className="h-full hover:shadow-md transition-all duration-300">
      <CardContent className="p-6 space-y-6">
        {/* Rating Stars */}
        <div className="flex gap-1">
          {Array.from({ length: testimonial.rating }).map((_, index) => (
            <span key={index} className="text-yellow-500 text-lg">★</span>
          ))}
        </div>

        {/* Quote */}
        <blockquote className="text-foreground leading-relaxed italic">
          &ldquo;{testimonial.content}&rdquo;
        </blockquote>

        {/* Author Info */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold">
              {testimonial.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {testimonial.position} at {testimonial.company}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}