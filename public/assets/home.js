const form = document.querySelector("#subscribe-form");
const message = document.querySelector("#message");
const submitButton = document.querySelector("#submit-button");

const setMessage = (type, text) => {
    message.className = "message";
    if (type === "success") message.classList.add("message--success");
    if (type === "error") message.classList.add("message--error");
    message.textContent = text;
};

const clearMessage = () => {
    message.className = "message";
    message.textContent = "";
};

const isValidRepoFormat = (repo) => {
    return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo);
};

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const repo = String(formData.get("repo") || "").trim();

    if (!email) {
        setMessage("error", "Вкажіть email.");
        return;
    }

    if (!repo) {
        setMessage("error", "Вкажіть GitHub-репозиторій.");
        return;
    }

    if (!isValidRepoFormat(repo)) {
        setMessage("error", "Некоректний формат репозиторію. Використовуйте owner/repo.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Надсилання...";

    try {
        const response = await fetch("/api/subscribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, repo }),
        });

        if (response.ok) {
            setMessage("success", "Підписку створено. Перевірте email і підтвердьте її через посилання в листі.");
            form.reset();
            return;
        }

        if (response.status === 400) {
            setMessage("error", "Некоректні дані. Перевірте email і формат репозиторію.");
            return;
        }

        if (response.status === 404) {
            setMessage("error", "Репозиторій не знайдено на GitHub.");
            return;
        }

        if (response.status === 409) {
            setMessage("error", "Цей email вже підписаний на вказаний репозиторій.");
            return;
        }

        let errorText = "Сталася помилка. Спробуйте пізніше.";

        try {
            const data = await response.json();
            if (data && typeof data.message === "string") {
                errorText = data.message;
            }
        } catch (_) {}

        setMessage("error", errorText);
    } catch (error) {
        setMessage("error", "Не вдалося підключитися до сервера.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Підписатися";
    }
});
