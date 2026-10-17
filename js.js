const table = document.getElementById("ranking").getElementsByTagName("tbody")[0]
const selector = document.getElementById("categories")
const spanFloor = document.getElementById("floor")
const spanType = document.getElementById("type")

const rankId = ["top_one", "top_two", "top_three"]
const bossNames = ["watcher", "bonzo", "scarf", "professor", "thorn", "livid", "sadan", "necron"]
const soloRooms = ["deathmite", "dinosite", "melon", "mines", "withermancer", "atlas", "museum"]

let soloClears = []
let completionRuns = []

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)]

const clearTable = () => {
    const trs = table.getElementsByTagName("tr")
    for (let idx = trs.length - 1; idx > 0; idx--) {
        table.removeChild(trs[idx])
    }
}

const formatSeconds = (seconds) => {
    let ss = Math.floor(seconds)
    let mm = Math.floor(ss / 60)
    let hh = Math.floor(mm / 60)
    let str = ""

    ss %= 60
    mm %= 60
    hh %= 24

    if (hh) str += `${hh}h`
    if (mm) str += ` ${mm}m`

    str += ` ${ss}s`
    return str
}

const fetchUUID = async (uuid) => {
    let name = null
    try {
        const response = await fetch(`https://playerdb.co/api/player/minecraft/${uuid}`)
        if (!response.ok)
            throw new Error(`Bad Response? ${response.status}`)
        const res = await response.json()

        name = res.data?.player?.username
    } catch (error) {
        console.error(error.message)
    }

    return name
}

const fetchCompletions = async () => {
    if (completionRuns.length != 0) return completionRuns

    let list = []
    try {
        const response = await fetch("https://raw.githubusercontent.com/Synnerz/devonianleaderboard/refs/heads/v2/dungeons/completions.json")
        if (!response.ok)
            throw new Error(`Bad Response? ${response.status}`)
        const res = await response.json()

        for (it of res) {
            const playerNames = []

            for await (const uuid of it.players) {
                const name = await fetchUUID(uuid)
                if (name) playerNames.push(name)
            }

            if (playerNames.length != 0 && it.displayNames)
                it.teamName = playerNames.join(", ")

            list.push(it)
        }

        completionRuns = list
    } catch (error) {
        console.error(error.message)
    }

    return list
}

const fetchSoloClears = async () => {
    if (soloClears.length != 0) return soloClears

    let list = []
    try {
        const response = await fetch("https://raw.githubusercontent.com/Synnerz/devonianleaderboard/refs/heads/v2/dungeons/solo_clears.json")
        if (!response.ok)
            throw new Error(`Bad Response? ${response.status}`)
        const res = await response.json()

        for (it of res) {
            const nameResponse = await fetchUUID(it.player)
            const name = nameResponse ? nameResponse : "UNKNOWN"

            it.player = name
            list.push(it)
        }

        soloClears = list
    } catch (error) {
        console.error(error.message)
    }

    return list
}

const fetchLB = async (floor = "M7") => {
    if (floor.startsWith("SOLO")) {
        const res = await fetchSoloClears()
        return res.filter((it) => it.floor == floor.replace("SOLO", ""))
    }

    const res = await fetchCompletions()
    return res.filter((it) => it.floor == floor)
}

const loadTable = async (floor = "M7") => {
    try {
        const data = await fetchLB(floor)
        const sorted = data.sort((a, b) => a.time - b.time)

        for (let idx = 0; idx < sorted.length; idx++) {
            let run = sorted[idx]
            let roleId = rankId[idx]
            let clz = roleId ? `class="${roleId}"` : ""

            table.insertAdjacentHTML("beforeend", `
            <tr>
                <td ${clz}>${idx + 1}</td>
                <td ${clz}>${run.teamName ?? run.player}</td>
                <td ${clz}>${formatSeconds(run.time)}</td>
                <td ${clz}>${run.uploadedAt}</td>
            </tr>
            `)
        }
    } catch (error) {
        console.error(error.message)
    }
}

loadTable()

selector.addEventListener("change", (event) => {
    /** @type {string} */
    const value = event.target.value
    const valueText = event.target.options[event.target.selectedIndex].text

    if (value.startsWith("SOLO")) {
        clearTable()

        const img = `, url("images/clear/${randomFrom(soloRooms)}.png")`
        document.body.style.background = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6))${img}`

        spanFloor.innerText = valueText
        spanFloor.style.color = valueText.startsWith("M") ? "darkred" : "red"
        spanType.innerText = "SoloClear"
        spanType.style.color = "yellow"

        loadTable(value)
        return
    }

    const num = value.match(/(\d+)/)?.[1]
    if (num == null) {
        console.log("swp num is null")
        return
    }
    const boss = bossNames[num]
    if (boss == null) {
        console.log(`could not find img ${boss}-${num}`)
        return
    }

    clearTable()

    const img = `, url("images/boss/${boss}.png")`
    document.body.style.background = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6))${img}`

    spanFloor.innerText = valueText
    spanFloor.style.color = valueText.startsWith("M") ? "darkred" : "red"
    spanType.innerText = "S+"
    spanType.style.color = "gold"

    loadTable(value)
})
