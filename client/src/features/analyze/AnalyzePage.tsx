import { useState } from 'react'

import { PageHeader } from '@/components/PageHeader'
import { SegmentedControl } from '@/components/SegmentedControl'

import { FileCheckTab } from './FileCheckTab'
import { SweepTab } from './SweepTab'

type Tab = 'file' | 'sweep'

const TABS = [
  { value: 'file', label: 'Kiểm tra file' },
  { value: 'sweep', label: 'So sánh hai chế độ' },
] satisfies { value: Tab; label: string }[]

export function AnalyzePage() {
  const [tab, setTab] = useState<Tab>('file')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Đánh giá · Khả năng bị phát hiện"
        title="Analyze"
        description="Tin giấu có bị phát hiện không? Kiểm tra một file, hoặc so sánh Classic với Hardened."
      />
      <SegmentedControl
        aria-label="Chế độ phân tích"
        value={tab}
        onChange={setTab}
        options={TABS}
        className="w-full sm:w-auto"
      />
      {/* Giữ cả hai tab trong cây để không mất kết quả (nhất là sweep chạy lâu) khi chuyển tab. */}
      <div hidden={tab !== 'file'} className="animate-in duration-300 fade-in-0">
        <FileCheckTab />
      </div>
      <div hidden={tab !== 'sweep'} className="animate-in duration-300 fade-in-0">
        <SweepTab />
      </div>
    </div>
  )
}
