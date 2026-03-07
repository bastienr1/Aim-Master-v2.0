import { useState, useCallback } from 'react';
import { X, Target, Flame, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import type { GoalType, GoalCategory } from '@/types/goals';
import { GOAL_TYPE_INFO, GOAL_TEMPLATES, CATEGORY_OPTIONS, type GoalTemplate } from '@/data/goalTemplates';

interface GoalCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (goal: {
    title: string;
    description?: string;
    goal_type: GoalType;
    category?: GoalCategory | null;
    target_value: number;
    unit: string;
    deadline?: string;
    priority: 1 | 2 | 3;
    created_from: string;
  }) => Promise<void>;
}

type Step = 'type' | 'template' | 'details';

const TYPE_ICONS: Record<GoalType, React.ElementType> = {
  process: Target,
  habit: Flame,
  outcome: Trophy,
};

export function GoalCreationModal({ isOpen, onClose, onCreate }: GoalCreationModalProps) {
  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<GoalType | null>(null);
  const [isCustom, setIsCustom] = useState(false);

  // Details form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState<number>(0);
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setStep('type');
    setSelectedType(null);
    setIsCustom(false);
    setTitle('');
    setDescription('');
    setTargetValue(0);
    setUnit('');
    setCategory(null);
    setDeadlineDays(14);
    setPriority(2);
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleTypeSelect = (type: GoalType) => {
    setSelectedType(type);
    setStep('template');
  };

  const handleTemplateSelect = (template: GoalTemplate | null) => {
    if (template) {
      setIsCustom(false);
      setTitle(template.title.replace('{X}', String(template.default_target)));
      setDescription(template.description);
      setTargetValue(template.default_target);
      setUnit(template.unit);
      setCategory(template.category as GoalCategory | null);
      setDeadlineDays(template.default_deadline_days);
    } else {
      setIsCustom(true);
      setTitle('');
      setDescription('');
      setTargetValue(0);
      setUnit('');
      setCategory(null);
      const defaults: Record<GoalType, number> = { process: 14, habit: 7, outcome: 28 };
      setDeadlineDays(defaults[selectedType!] || 14);
    }
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays);

    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      goal_type: selectedType!,
      category,
      target_value: targetValue,
      unit,
      deadline: deadline.toISOString(),
      priority,
      created_from: isCustom ? 'manual' : 'manual',
    });

    handleClose();
  };

  if (!isOpen) return null;

  const filteredTemplates = GOAL_TEMPLATES.filter((t) => t.goal_type === selectedType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[480px] bg-[#0F1923] rounded-2xl overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 32px)' }}
      >
        <div className="overflow-y-auto max-h-[calc(100vh-32px)] p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {step !== 'type' && (
                <button
                  onClick={() => setStep(step === 'details' ? 'template' : 'type')}
                  className="text-[#5A6872] hover:text-[#9CA8B3] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="font-['Rajdhani'] text-xl font-semibold text-[#ECE8E1]">
                  {step === 'type' ? 'Set a New Goal' : step === 'template' ? 'Choose a Template' : 'Goal Details'}
                </h2>
                <p className="text-xs font-['Inter'] text-[#5A6872] mt-0.5">
                  {step === 'type'
                    ? 'What kind of goal?'
                    : step === 'template'
                    ? `${GOAL_TYPE_INFO[selectedType!].label} templates`
                    : 'Customize your goal'}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-[#5A6872] hover:text-[#9CA8B3] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: Choose Type */}
          {step === 'type' && (
            <div className="space-y-3">
              {(Object.keys(GOAL_TYPE_INFO) as GoalType[]).map((type) => {
                const info = GOAL_TYPE_INFO[type];
                const Icon = TYPE_ICONS[type];
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className="w-full text-left rounded-xl p-4 border transition-all hover:brightness-110"
                    style={{
                      backgroundColor: `${info.color}08`,
                      borderColor: `${info.color}33`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${info.color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: info.color }} />
                        </div>
                        <div>
                          <h3 className="font-['Rajdhani'] text-base font-semibold text-[#ECE8E1]">
                            {info.label}
                          </h3>
                          <p className="text-xs font-['Inter'] text-[#9CA8B3]">{info.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#5A6872]" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Choose Template */}
          {step === 'template' && (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full text-left rounded-xl p-4 bg-[#1C2B36] border border-white/5 hover:border-white/15 transition-all"
                >
                  <h4 className="font-['Inter'] text-sm font-medium text-[#ECE8E1] mb-1">
                    {template.title.replace('{X}', String(template.default_target))}
                  </h4>
                  <p className="text-xs text-[#5A6872] font-['Inter']">{template.description}</p>
                </button>
              ))}
              <button
                onClick={() => handleTemplateSelect(null)}
                className="w-full text-left rounded-xl p-4 border border-dashed border-[#5A6872]/30 hover:border-[#5A6872]/60 transition-all"
              >
                <h4 className="font-['Inter'] text-sm font-medium text-[#9CA8B3]">
                  Write your own
                </h4>
                <p className="text-xs text-[#5A6872] font-['Inter']">Create a custom goal</p>
              </button>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 'details' && (
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="text-xs font-['Inter'] text-[#9CA8B3] mb-1.5 block">Goal Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you working toward?"
                  className="w-full bg-[#1C2B36] border border-white/10 rounded-lg px-4 py-3 text-sm font-['Inter'] text-[#ECE8E1] placeholder-[#5A6872] outline-none focus:border-[#FF4655]/50 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-['Inter'] text-[#9CA8B3] mb-1.5 block">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why does this matter to you?"
                  rows={2}
                  className="w-full bg-[#1C2B36] border border-white/10 rounded-lg px-4 py-3 text-sm font-['Inter'] text-[#ECE8E1] placeholder-[#5A6872] outline-none focus:border-[#FF4655]/50 transition-colors resize-none"
                />
              </div>

              {/* Target + Unit row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-['Inter'] text-[#9CA8B3] mb-1.5 block">Target</label>
                  <input
                    type="number"
                    value={targetValue || ''}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-[#1C2B36] border border-white/10 rounded-lg px-4 py-3 text-sm font-['JetBrains_Mono'] text-[#ECE8E1] placeholder-[#5A6872] outline-none focus:border-[#FF4655]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-['Inter'] text-[#9CA8B3] mb-1.5 block">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="%, sessions, score"
                    className="w-full bg-[#1C2B36] border border-white/10 rounded-lg px-4 py-3 text-sm font-['Inter'] text-[#ECE8E1] placeholder-[#5A6872] outline-none focus:border-[#FF4655]/50 transition-colors"
                  />
                </div>
              </div>

              {/* Category */}
              {isCustom && (
                <div>
                  <label className="text-xs font-['Inter'] text-[#9CA8B3] mb-1.5 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setCategory(category === opt.value ? null : opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-['Inter'] transition-all ${
                          category === opt.value
                            ? 'bg-[#53CADC]/20 text-[#53CADC] border border-[#53CADC]/40'
                            : 'bg-[#1C2B36] text-[#9CA8B3] border border-white/5 hover:border-white/15'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Deadline */}
              <div>
                <label className="text-xs font-['Inter'] text-[#9CA8B3] mb-1.5 block">Deadline</label>
                <div className="flex gap-2">
                  {[7, 14, 21, 28].map((days) => (
                    <button
                      key={days}
                      onClick={() => setDeadlineDays(days)}
                      className={`flex-1 py-2 rounded-lg text-xs font-['JetBrains_Mono'] transition-all ${
                        deadlineDays === days
                          ? 'bg-[#FF4655]/20 text-[#FF4655] border border-[#FF4655]/40'
                          : 'bg-[#1C2B36] text-[#9CA8B3] border border-white/5 hover:border-white/15'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-['Inter'] text-[#9CA8B3] mb-1.5 block">Priority</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPriority(1)}
                    className={`flex-1 py-2 rounded-lg text-xs font-['Inter'] transition-all ${
                      priority === 1
                        ? 'bg-[#FF4655]/20 text-[#FF4655] border border-[#FF4655]/40'
                        : 'bg-[#1C2B36] text-[#9CA8B3] border border-white/5 hover:border-white/15'
                    }`}
                  >
                    Primary Focus
                  </button>
                  <button
                    onClick={() => setPriority(2)}
                    className={`flex-1 py-2 rounded-lg text-xs font-['Inter'] transition-all ${
                      priority === 2
                        ? 'bg-[#53CADC]/20 text-[#53CADC] border border-[#53CADC]/40'
                        : 'bg-[#1C2B36] text-[#9CA8B3] border border-white/5 hover:border-white/15'
                    }`}
                  >
                    Supporting
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || submitting}
                className="w-full rounded-lg py-3 text-sm font-semibold font-['Inter'] text-white transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#FF4655',
                  opacity: title.trim() && !submitting ? 1 : 0.4,
                  cursor: title.trim() && !submitting ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
