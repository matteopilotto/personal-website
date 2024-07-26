import { marked } from "marked"

const productUrl = document.getElementById("product-url")
const submitButton = document.getElementById("submit-button")
const responseContainer = document.querySelector('.response-container')
const textResponse = document.querySelector(".response")
const infoParagraph = document.querySelector(".info-paragraph")
// const summaryGenLoadingParagraph = document.querySelector(".loading2-paragraph")

submitButton.addEventListener("click", function(e) {
    e.preventDefault();
    main()

})


async function main() {

    // reset views
    submitButton.disabled = true
    infoParagraph.style.display = "none"
    responseContainer.style.display = "none"
    textResponse.innerHTML = ""

    if (productUrl.value === "") {
        infoParagraph.innerHTML = "Please provide a valid Product URL from Nike.com"
        infoParagraph.style.display = "flex"
        console.log("[INFO] Missing or invalid Product URL.")
    } else {
        try {
            const reviews = await fetchReviews(productUrl.value)
            // console.log(reviews)
        
            let reviewText = ""
            let reviewCount = 1
            for ( const review of reviews ) {
                reviewText += `Review #${reviewCount}:\n${review}\n\n`
                reviewCount++
            }
            // console.log(`Reviews:\n${reviewText}`)
        
            const summary = await generateSummary(reviewText)
    
            console.log(summary)
            textResponse.innerHTML = marked.parse(summary)
            infoParagraph.style.display = "none"
            responseContainer.style.display = "flex"
    
        } catch(error) {
            console.log("[INFO] Something went wrong.")
            console.error(error.message)
        }
    }

    submitButton.disabled = false
}


const system_msg = `
You're best person of the world at summarizing customers' reviews.
You will receive a list of reviews and your task is to write a one-paragraph summary that clealy capture the sentiment of the customers, highlighing what they like and what they didn't like.
Strictly follow the output template below. Do not add anything else. Do not any any new line between sections.

Output template:
**✨ Overall sentiment:**
Start with a general statement about the overall tone of the reviews (positive, mixed, negative) and any notable trends.<br>
**❤️ What people love:**
Highlight 2-3 main strengths or aspects that customers frequently praised.<br>
**❤️‍🩹 What people don't like:**
Briefly mention 1-2 common criticisms or suggestions for enhancement.<br>
**📝 What people say:**
Include a couple of short, representative quotes or specific comments to illustrate key points.<br>
`.trim()


async function generateSummary(context) {
    infoParagraph.innerHTML = "Generating summary..."
    // summaryGenLoadingParagraph.style.display = "flex"

    const chatMessages = {
        system: system_msg,
        messages: []
    }

    chatMessages.messages.push({
        role: "user",
        content: [{
            "type": "text",
            "text": `${context}`
        }]
    })

    try {
        const url = "https://anthropic-api-worker.matteo-pilotto.workers.dev/"

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(chatMessages)
        })

        const summary = await response.json()
        // console.log(summary)
        // summaryGenLoadingParagraph.style.display = "none"
        return summary

    } catch(error) {
        infoParagraph.innerHTML = "Something went wrong. Please try again."
        console.log("[INFO] Something went wrong.")
        // console.error(error.message)
    }
}

async function fetchReviews(product_url) {
    infoParagraph.innerHTML = "Collecting reviews..."
    infoParagraph.style.display = "flex"

    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1 second

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const url = "https://nike-review-scraper-d5f9390fc8b5.herokuapp.com/scrape"
            
    
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({url: product_url, page_limit: "5"})
            })
    
            const data = await response.json()

            if (data.error) {
                infoParagraph.innerHTML = data.error
                break
            }
              
            if (data.length === 0) {
                throw new Error("Empty response received.")
            }
            // console.log(`scraper response:\n${JSON.stringify(data, null, 4)}`)

            const reviews = data.map(item => item.content)
    
            // infoParagraph.style.display = "none"
            return reviews
    
        } catch(error) {
            console.log(`[INFO] Attempt #${attempt} failed.`)

            if (attempt === MAX_RETRIES) {
                infoParagraph.innerHTML = "Something went wrong. Please try again."
                console.log("[INFO] Something went wrong.")
                console.error(error.message)
                // throw new Error("Max retries reached. Operation failed.")
            }

            // wait before next retry
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        }
    }
}
