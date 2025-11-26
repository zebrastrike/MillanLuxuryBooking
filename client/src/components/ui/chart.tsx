import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

const THEMES = {
  light: ".light",
  dark: ".dark"
}

export type ChartConfig = {
  [key: string]: {
    label?: string
    color?: string
    theme?: Record<keyof typeof THEMES, string>
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

// ---------- GLOBAL SAFETY HELPERS ----------
function safeObj<T extends object>(value: any): T {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as T)
    : ({} as T)
}

function safeEntries(value: any): [string, any][] {
  const obj = safeObj<Record<string, any>>(value)
  try {
    return Object.entries(obj)
  } catch {
    return []
  }
}
// ------------------------------------------


export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config?: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  const safeConfig = safeObj<ChartConfig>(config)

  return (
    <ChartContext.Provider value={{ config: safeConfig }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={safeConfig} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"


const ChartStyle = ({ id, config }: { id: string; config?: ChartConfig }) => {
  const safeConfig = safeObj<ChartConfig>(config)

  const colorConfig = safeEntries(safeConfig).filter(
    ([, value]) => value?.theme || value?.color
  )

  if (!colorConfig.length) return null

  const css = safeEntries(THEMES)
    .map(([theme, prefix]) => {
      const vars = colorConfig
        .map(([key, item]) => {
          const color =
            item.theme?.[theme as keyof typeof item.theme] || item.color
          return color ? `  --color-${key}: ${color};` : null
        })
        .filter(Boolean)
        .join("\n")

      return `
${prefix} [data-chart=${id}] {
${vars}
}`
    })
    .join("\n")

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}

export { useChart }
