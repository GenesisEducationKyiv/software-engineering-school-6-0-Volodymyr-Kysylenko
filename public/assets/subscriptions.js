const searchForm = document.querySelector("#search-form");
const searchMessage = document.querySelector("#search-message");
const checkButton = document.querySelector("#check-button");
const subscriptionsList = document.querySelector("#subscriptions-list");

const setSearchMessage = (type, text) => {
    searchMessage.className = "message";
    if (type === "success") searchMessage.classList.add("message--success");
    if (type === "error") searchMessage.classList.add("message--error");
    searchMessage.textContent = text;
};

const clearSearchMessage = () => {
    searchMessage.className = "message";
    searchMessage.textContent = "";
};

const renderSubscriptions = (subscriptions) => {
    if (subscriptions.length === 0) {
        subscriptionsList.innerHTML = '<div class="no-subscriptions">Підписки не знайдено</div>';
    } else {
        const html = subscriptions
            .map(
                (sub) => `
          <div class="subscription-item">
            <div class="subscription-repo"><a href="https://github.com/${sub.repo}" target="_blank">${sub.repo}</a></div>
            <div class="subscription-status ${sub.confirmed ? "subscription-status--confirmed" : ""}">
              ${sub.confirmed ? "Підтверджено" : "Очікує підтвердження"}
              ${sub.last_seen_tag ? ` • Останній реліз: ${sub.last_seen_tag}` : " • без релізів"}
            </div>
          </div>
        `,
            )
            .join("");
        subscriptionsList.innerHTML = html;
    }
    subscriptionsList.style.display = "block";
};

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearSearchMessage();
    subscriptionsList.style.display = "none";

    const formData = new FormData(searchForm);
    const email = String(formData.get("email") || "").trim();

    if (!email) {
        setSearchMessage("error", "Вкажи email.");
        return;
    }

    checkButton.disabled = true;
    checkButton.textContent = "Завантаження...";

    try {
        const response = await fetch(`/api/subscriptions?email=${encodeURIComponent(email)}`);

        if (response.ok) {
            const subscriptions = await response.json();
            renderSubscriptions(subscriptions);
            return;
        }

        if (response.status === 400) {
            setSearchMessage("error", "Некоректний email.");
            return;
        }

        setSearchMessage("error", "Сталася помилка. Спробуй пізніше.");
    } catch (error) {
        setSearchMessage("error", "Не вдалося підключитися до сервера.");
    } finally {
        checkButton.disabled = false;
        checkButton.textContent = "Показати підписки";
    }
});
