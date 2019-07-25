'use strict'

const puppeteer = require('puppeteer')
const request = require('request')
const fs = require('fs')
const path = require('path')
const { exec }  = require('child_process')

const emitens = [
	{ kode: 'BRIS', nama: 'Bank BRI Syariah' },
]

const getPDF = d => {
	const dir = path.resolve(process.argv[2] || __dirname, d.kode, 'LK', d.tahun)
	exec(`mkdir -p ${ dir }`)
	setTimeout(() => {
		return new Promise(resolve => {
			request(d.url)
				.pipe(fs.createWriteStream(path.resolve(dir, `${ d.name }.pdf`)))
				.on('open', () => console.log(`Mengunduh File ${ dir }/${ d.name }.pdf`))
				.on('close', () => console.log(`Berhasil Mengunduh File ${ dir }/${ d.name }.pdf`))
			resolve(true)
		})
	}, 200)
}

const run = async () => {
	if(!emitens.length) throw Error('Tidak Ada Emiten')
	try {
		const browser = await puppeteer.launch({
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		})
		let data = []
		const page = await browser.newPage()
		for(let emiten of emitens){
			await page.goto(`https://idnfinancials.com/${ emiten.kode }/pt-${ emiten.nama }-tbk/documents`)
			const results = await page.evaluate(({ emiten }) => {
				const data = []
				const rows = document.querySelectorAll('#table-reports tr')
				rows.forEach(row => {
					const anchor = row.querySelectorAll('a')
					anchor.forEach(a => data.push({
						kode: emiten.kode,
						tahun: row.children[0].textContent,
						name: a.textContent,
						url: a.getAttribute('href')
					}))
				})
				return data
			}, { emiten })
			data = data.concat(process.argv[3] ? results.filter(res => res.tahun == process.argv[3]) : results)
		}
		browser.close()
		const promise = []
		for(let d of data) promise.push(getPDF(d))
		await Promise.all(promise)
	} catch (err) {
		console.log(err)
	}
}

run()