import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { company } from "@/data/company"
import ContactForm from "@/components/forms/ContactForm"
import { Mail, Phone, MapPin } from "lucide-react"

export default function Contact() {
  return (
    <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Content Column */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl">
                Ready to Start Your Project?
              </h2>
              <p className="text-lg text-primary-foreground/80">
                Let&apos;s transform your vision into reality. Get in touch with our team for a free consultation and discover how we can elevate your brand.
              </p>
            </div>

            {/* Contact Methods */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-foreground rounded-lg flex items-center justify-center text-primary">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">Email Us</div>
                  <div className="text-primary-foreground/70">{company.email}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-foreground rounded-lg flex items-center justify-center text-primary">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">Call Us</div>
                  <div className="text-primary-foreground/70">{company.phone}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-foreground rounded-lg flex items-center justify-center text-primary">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">Visit Us</div>
                  <div className="text-primary-foreground/70">
                    {company.address.street}, {company.address.city}, {company.address.state}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button variant="secondary" size="lg">
                Get Free Consultation
              </Button>
            </div>
          </div>

          {/* Form Column */}
          <div>
            <Card className="bg-background">
              <CardHeader>
                <CardTitle>
                  Send Us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}