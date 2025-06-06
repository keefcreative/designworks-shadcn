import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Service } from "@/data/services"

interface ServiceCardProps {
  service: Service
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card className="group hover:shadow-[0_4px_80px_rgba(0,0,0,.08)] transition-all duration-[400ms] cursor-pointer h-full">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center text-4xl bg-[rgb(var(--light-1))] rounded-lg group-hover:bg-[rgb(var(--accent))] group-hover:scale-110 transition-all duration-[400ms]">
          {service.icon}
        </div>
        <CardTitle className="font-[var(--font-heading)] text-[rgb(var(--heading))] text-[24px] leading-[28px]">
          {service.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-[rgb(var(--muted-foreground))] leading-relaxed">
          {service.description}
        </p>
        {service.features && (
          <div className="pt-4 border-t border-[rgb(var(--border))]">
            <ul className="space-y-2 text-sm text-[rgb(var(--muted-foreground))]">
              {service.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[rgb(var(--accent))] rounded-full"></span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}