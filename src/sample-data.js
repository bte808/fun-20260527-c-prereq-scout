export const starterSheets = [
  {
    id: "measurement-lab",
    name: "Measurement lab",
    sheet: `Signals and noise |  | 2 | I remember the intuition but not the formal distinction
Sampling rate | Signals and noise | 1 | Nyquist examples still feel shaky
Aliasing | Sampling rate | 1 | I mix it up with quantization
Quantization error | Sampling rate | 3 | Comfortable with the rough idea
Sensor calibration | Signals and noise | 2 | Need a cleaner checklist
Uncertainty propagation | Sensor calibration, Quantization error | 1 | Formula steps are easy to lose
Control chart reading | Sensor calibration | 4 | I can explain this to someone else
Experiment validity | Sensor calibration, Uncertainty propagation | 2 | Need better language for reports`
  },
  {
    id: "exam-review",
    name: "Exam review",
    sheet: `Core definitions |  | 2 | Can recognize terms but explanations are uneven
Worked examples | Core definitions | 1 | Need slower step-by-step practice
Formula selection | Core definitions | 2 | Sometimes choose the wrong relation
Past-paper timing | Worked examples, Formula selection | 1 | Speed drops under pressure
Error log review | Worked examples | 3 | Notes exist but need grouping
Teach-back summary | Formula selection, Error log review | 2 | Need a cleaner oral explanation`
  },
  {
    id: "paper-methods",
    name: "Paper methods",
    sheet: `Research question |  | 3 | Main claim is clear enough
Dataset shape | Research question | 2 | Need variable and sample-size notes
Assumption check | Dataset shape | 1 | Easy to skip in a quick read
Model choice | Assumption check | 2 | Need to compare against the paper's stated goal
Result table | Model choice | 3 | Can read values but not caveats
Limitations paragraph | Assumption check, Result table | 1 | Need language for what is not supported`
  }
];

export const sampleTopicSheet = starterSheets[0].sheet;
