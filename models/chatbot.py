from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
from peft import get_peft_model, LoraConfig, TaskType
from datasets import load_dataset

model_name = "google/gemma-2b"
dataset = load_dataset("json", data_files="finetune_dataset.jsonl")

tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

def format(example):
    prompt = f"<start_of_turn>user\n{example['instruction']}<end_of_turn>\n<start_of_turn>model\n{example['output']}<end_of_turn>"
    tokens = tokenizer(prompt, truncation=True, padding="max_length", max_length=512)
    tokens["labels"] = tokens["input_ids"].copy()
    return tokens

dataset = dataset.map(format)

model = AutoModelForCausalLM.from_pretrained(model_name, load_in_4bit=True, device_map="auto")
lora_config = LoraConfig(task_type=TaskType.CAUSAL_LM, r=8, lora_alpha=16, lora_dropout=0.1)

model = get_peft_model(model, lora_config)

training_args = TrainingArguments(
    output_dir="./gemma-support-bot",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2,
    logging_steps=10,
    save_steps=200,
    learning_rate=2e-4,
    fp16=True,
    optim="paged_adamw_8bit",
    report_to="none"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    tokenizer=tokenizer
)

trainer.train()
model.save_pretrained("./gemma-support-bot")
tokenizer.save_pretrained("./gemma-support-bot")
