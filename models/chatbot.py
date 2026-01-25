from transformers import AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from datasets import Dataset
from peft import get_peft_model, LoraConfig, TaskType
import json
import torch

# ===== Load and format your dataset =====
def load_dataset(path):
    with open(path, "r") as f:
        raw_data = json.load(f)

    formatted = []
    for item in raw_data:
        user_msg = item["messages"][0]["content"]
        bot_msg = item["messages"][1]["content"]
        formatted.append({
            "text": f"<start_of_turn>user\n{user_msg}<end_of_turn>\n<start_of_turn>model\n{bot_msg}<end_of_turn>"
        })
    return Dataset.from_list(formatted)

# ===== Load model and tokenizer =====
model_id = "google/gemma-3n-E2B"
tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    load_in_8bit=True,
    torch_dtype=torch.float16,
    device_map="auto"
)

# ===== Apply LoRA for PEFT (efficient finetuning) =====
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)
model = get_peft_model(model, lora_config)

# ===== Prepare dataset =====
dataset = load_dataset(r"C:\Users\palya\Desktop\pharmalens\Pharmalens\models\training_data\medquad_finetune.jsonl")

def tokenize(batch):
    return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=512)

tokenized_dataset = dataset.map(tokenize)

# ===== Training arguments =====
training_args = TrainingArguments(
    output_dir="./finetuned-gemma",
    per_device_train_batch_size=1,
    num_train_epochs=3,
    logging_steps=10,
    save_strategy="epoch",
    learning_rate=2e-4,
    fp16=True,
    report_to="none"
)

# ===== Trainer =====
data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    data_collator=data_collator,
)

trainer.train()

# Save the finetuned model
model.save_pretrained("finetuned-gemma")
tokenizer.save_pretrained("finetuned-gemma")
