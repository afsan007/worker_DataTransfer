const readline = require("readline"),
  events = require("events"),
  _ = require("lodash"),
  clc = require("chalk"),
  MuteStream = require("mute-stream");

const { StartComponent, StatusHandler } = require("../components");
const { BaseUI, ManPage, stopPro } = require("./util");

/*
    1/ All files inside vender/inquirer have access to all methods of this files.[by parent name in them files]
*/

class _EventsEmitter extends events {}
class CliInterface extends BaseUI {
  constructor(props) {
    super(props);
    this.exitAllow = 0;
    this.e = new _EventsEmitter();
    this.startCL = new StartComponent();
    this.statusCl = new StatusHandler();
    this.manCL = new ManPage();
  }
  eventListeners() {
    this.e.on("start", str => this.startCL.start(str, this));
    this.e.on("status", _ => this.statusCl.master(this.rl));
    this.e.on("log", _ => this.log());
    this.e.on("test", _ => this.test());
    this.e.on("health", _ => this.healthCheck());
    this.e.on("setting", _ => this.setting());
    this.e.on("exit", _ => this.exit());
    this.e.on("stop", str => stopPro(this, str));
    this.e.on("man", _ => this.manCL.run(this.possibleCommands));
    this.e.on("help", _ => this.manCL.run(this.possibleCommands));
    this.e.on("clear", _ => console.clear());
  }
  init() {
    let commands = this.e.eventNames();
    let ms = new MuteStream();
    ms.pipe(process.stdout);
    let output = ms;
    this.rl = readline.createInterface({
      input: process.stdin,
      output,
      prompt: ">>",
      completer: line => {
        let hits = commands.filter(c => c.startsWith(line));
        return [hits.length ? hits : commands, line];
      }
    });

    this.rl.on("SIGINT", () => {
      if (this.exitAllow < 1) {
        console.log(clc.red.bold("\r\n(To exit, press ^C again or ^D)"));
        this.rl.prompt();
      } else {
        this.onForceClose();
      }
      this.exitAllow++;
    });

    this.rl.prompt();
    this.rl.on("line", str => {
      if (this.exitAllow === 1) this.exitAllow = 0;
      let misType = [];
      str =
        typeof str == "string" && str.trim().length > 0
          ? str.trim().toLowerCase()
          : false;
      let result = commands.some(el => {
        let regex = new RegExp("\\b" + el + "\\b", "g");
        if (!str) return false;
        if (str.match(regex)) {
          str.split(" ")[0] !== el
            ? misType.push("misType", el, str)
            : this.e.emit(el, str);
          return true;
        }
        if (el.indexOf(str) > -1 || str.startsWith(el)) {
          misType.push("misType", el, str);
          return true;
        }
      });
      if (misType[0] === "misType") {
        this.rl.question(
          `Did you mean? ${misType[1]} Type::[Y]Yes/[N]No >>`,
          ans => {
            let regex = /((yes)|[y])\b/gim;
            if (regex.test(ans)) this.e.emit(misType[1], misType[2]);
            this.rl.prompt();
          }
        );
      }
      this.rl.prompt();
    });
  }
  onForceClose() {
    this.exit();
    process.kill(process.pid, "SIGINT");
  }
  exit() {
    this.exitAllow = 0;
    console.log(clc.bgCyan.bold.white("\r\n  Have Fun...  "), '❤️ ❤️ ❤️');
    this.rl.removeListener("SIGINT", this.onForceClose);
    process.removeListener("exit", this.onForceClose);
    this.rl.pause();
    this.rl.close();
    process.exit(0);
  }
}
module.exports = CliInterface;
