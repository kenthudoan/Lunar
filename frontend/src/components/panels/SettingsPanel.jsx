import { useState } from 'react'
import Modal from '../UI/Modal'
import { useGameStore } from '../../store'

const PROVIDERS = [
  { id: 'deepseek',  label: 'DeepSeek',  models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'anthropic', label: 'Anthropic', models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'] },
  { id: 'openai',   label: 'OpenAI',    models: ['gpt-4o', 'gpt-4o-mini'] },
]

export default function SettingsPanel({ open, onClose }) {
  const { llmProvider, llmModel, temperature, maxTokens, updateSettings } = useGameStore()
  const [provider, setProvider] = useState(llmProvider)
  const [model, setModel] = useState(llmModel)
  const [temp, setTemp] = useState(temperature)
  const [tokens, setTokens] = useState(maxTokens)
  const [saved, setSaved] = useState(false)

  const currentProviderModels = PROVIDERS.find((p) => p.id === provider)?.models || []

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    const providerModels = PROVIDERS.find((p) => p.id === newProvider)?.models || []
    setModel(providerModels[0] || '')
  }

  const handleSave = () => {
    updateSettings({ llmProvider: provider, llmModel: model, temperature: temp, maxTokens: tokens })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Modal open={open} onClose={onClose} title="Cài Đặt" size="md">
      <div className="p-4 space-y-5">
        {/* Provider */}
        <div>
          <label className="label">Nhà Cung Cấp LLM</label>
          <select value={provider} onChange={(e) => handleProviderChange(e.target.value)} className="input select">
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">{p.label}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="label">Mô Hình</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="input select">
            {currentProviderModels.map((m) => (
              <option key={m} value={m} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">{m}</option>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Nhiệt Độ</label>
            <span className="text-xs font-mono text-[var(--text-secondary)]">{temp.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={2} step={0.05} value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} className="w-full accent-white h-1.5 bg-[var(--accent-muted)] rounded-full appearance-none cursor-pointer" />
          <div className="flex justify-between text-[9px] text-[var(--text-disabled)] mt-1">
            <span>Chính xác</span><span>Cân bằng</span><span>Sáng tạo</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Token Tối Đa</label>
            <span className="text-xs font-mono text-[var(--text-secondary)]">{tokens}</span>
          </div>
          <input type="range" min={256} max={8192} step={256} value={tokens} onChange={(e) => setTokens(parseInt(e.target.value))} className="w-full accent-white h-1.5 bg-[var(--accent-muted)] rounded-full appearance-none cursor-pointer" />
          <div className="flex justify-between text-[9px] text-[var(--text-disabled)] mt-1">
            <span>Ngắn</span><span>Tiêu chuẩn</span><span>Mở rộng</span>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} className="w-full btn btn-primary">
          {saved ? '✓ Đã lưu!' : 'Áp Dụng'}
        </button>
      </div>
    </Modal>
  )
}
