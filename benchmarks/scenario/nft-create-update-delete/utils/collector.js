'use strict';

const fs = require('fs');
const path = require('path');

class Collector {
    constructor() {
        if (!Collector.instance) {
            this.stats = {
                '01. Create vs Create': 0,
                '02. Create vs Update': 0,
                '03. Create vs Delete': 0,
                '04. Update vs Create': 0,
                '05. Update vs Update': 0,
                '06. Update vs Delete': 0,
                '07. Delete vs Create': 0,
                '08. Delete vs Update': 0,
                '09. Delete vs Delete': 0
            };
            Collector.instance = this;
        }
        return Collector.instance;
    }

    recordPrevention(scenarioName) {
        if (this.stats.hasOwnProperty(scenarioName)) {
            this.stats[scenarioName]++;
            console.log(`[Metrics] 🛡️ 防御カウント加算 [${scenarioName}]: Total ${this.stats[scenarioName]}件`);
            this.saveToFile();
        }
    }

    saveToFile() {
        try {
            const filePath = path.join(process.cwd(), 'middleware_metrics.txt');
            let content = '================================================================\n';
            content += '   🛡️   Middleware Conflict Prevention Metrics Summary\n';
            content += '================================================================\n\n';
            
            for (const [scenario, count] of Object.entries(this.stats)) {
                content += `${scenario.padEnd(25)} : ${count} 件遮断\n`;
            }
            content += '\n================================================================\n';
            
            fs.writeFileSync(filePath, content, 'utf-8');
        } catch (err) {
            // 書き込みエラー無視
        }
    }
}

module.exports = new Collector();