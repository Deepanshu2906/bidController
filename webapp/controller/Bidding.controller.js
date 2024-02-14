sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "com/nauti/controllerportal/model/formatter",
    "sap/ui/core/format/NumberFormat",
  ],
  function (Controller, JSONModel, formatter, NumberFormat) {
    "use strict";
    /**
     * @type {sap.m.ValueCSSColor}
     */
    const LIGHTGREEN = "lightgreen";
    /**
     * @type {sap.m.ValueCSSColor}
     */
    const GREEN = "green";
    /**
     * @type {sap.m.ValueCSSColor}
     */
    const ORANGE = "orange";
    /**
     * @type {sap.m.ValueCSSColor}
     */
    const RED = "red";

    let oCurrencyFormat = NumberFormat.getCurrencyInstance();
    return Controller.extend("com.nauti.controllerportal.controller.Bidding", {
      formatter: formatter,
      /**
       * @override
       */
      onInit: function () {
        let that = this;
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.getRoute("RouteBidding").attachPatternMatched(this._onObjectMatched, this);
        oRouter.attachRouteMatched(function (oEvent) {
          let sRouteName = oEvent.getParameter("name");
          if (sRouteName !== "RouteBidding") {
            that._iInterval?.setInterval(-1);
            that._cdTrigger?.setInterval(-1);
            that.byId("currentQuote").setValue("");
            that.byId("bidFrom").setText("");
            that.byId("bidTo").setText("");
            that.byId("topCommTile").setValue("...").setIndicator("None");
            that.byId("commTileContent").setFooter(`Technical Score:`);
            that.byId("commTile").setSubheader(`Quote:`);
            that.byId("startMsgStrip").setVisible(false);
            that.byId("submitButton").setEnabled(false);
            that.byId("radialClock").setPercentage(0);
            that.byId("timeLeftCell").setText("Time Left - 00:00:00");
            that.getView().getModel("rankmodel")?.destroy();
            that.getView().getModel("rankmodel")?.refresh();
          }
        });
      },
      _onObjectMatched: async function (oEvent) {
        try {
          this._BusyDialog = new sap.m.BusyDialog({
            title: "Loading...",
          });
          this._BusyDialog.open();
          this._BusyTimeout = setTimeout(() => {
            if (this._BusyDialog) this._BusyDialog.setText("This is taking forever, please wait...");
          }, 5000);
          const rankModel = new JSONModel();
          this.getView().setModel(rankModel, "rankmodel");
          this.getView().getModel("rankmodel").forceNoCache(true);
          this._iInterval = new sap.ui.core.IntervalTrigger(5000);
          let selectedCharterNo = this.getOwnerComponent().getModel("nav").getProperty("/navigatedCharterno");
          let mode = this.getOwnerComponent().getModel("nav").getProperty("/navigatedMode");
          if (mode === "MANU") {
            this.byId("submitButton").setEnabled(false);
            this.byId("startMsgStrip").setVisible(true);
            this.byId("startButton").setVisible(true);
          } else {
            this.byId("submitButton").setEnabled(true);
            this.byId("startMsgStrip").setVisible(false);
            this.byId("startButton").setVisible(false);
            let rankData = await this._fetchFromService("/BidDataSet", `ImChat eq '${selectedCharterNo}'`);
            if (rankData[0]?.Name1 === "No Data Found." || rankData[0]?.Name1 === "Error.") {
              this.byId("centerDataTable").setNoDataText(rankData[0].Name1);
            } else {
              let that = this;
              rankModel.setData(rankData);
              rankData.forEach(async function (element, index, _arr) {
                let originalBid = await that._fetchFromService(
                  "/OriginalBidsSet",
                  `Chrnmin eq '${element.Chrnmin}' and Lifnr eq '${element.Lifnr}'`
                );
                rankModel.getData()[index].originalBid = oCurrencyFormat.format(
                  originalBid[0].Cvalue,
                  /* "USD" */ originalBid[0].Cunit
                );
                rankModel.getData()[index].originalBidValue = originalBid[0].Cvalue;
                rankModel.refresh();
              });
              // ignore the error for now, it works.
              let custQuote = await this._fetchFromService("/GetQuoteSet(IvChat='" + selectedCharterNo + "')");
              this.byId("currentQuote").setValue(oCurrencyFormat.format(custQuote.EvQuote, custQuote.EvUnit));
              let bids = this.getOwnerComponent().getModel("bidlist").getProperty("/bidList");
              let selectedBid = bids.find((element) => element.Chrnmin === selectedCharterNo);
              this.byId("bidFrom").setText(
                `${formatter.dateFormat(
                  selectedBid.Chrqsdate // changed from selectedBid.Chrqstime to selectedBid.Chrqsdate - 14.06.2023 - Khushal
                )} ${formatter.formatTime(selectedBid.Chrqstime)}`
              );
              this.byId("bidTo").setText(
                `${formatter.dateFormat(selectedBid.Chrqedate)} ${formatter.formatTime(selectedBid.Chrqetime)}`
              );
              // let topTechVendor = rankData.filter(
              //   (element) => element.TRank === "T1"
              // );
              let topCommVendor = rankData.filter((element) => element.CRank === "L1");
              // this.byId("topTechTile").setValue(topTechVendor[0].Name1);
              this.byId("topCommTile").setValue(topCommVendor[0].Name1).setIndicator("Up");
              this._iInterval.addListener(this._setCurrentBids.bind(this));
              // let start = new Date("2022-09-23T10:16:00").getTime();
              let start = new Date(
                `${formatter.dateFormat(selectedBid.Chrqsdate)}T${formatter.formatTime(selectedBid.Chrqstime)}`
              ).getTime();
              // let end = new Date("2022-09-23T20:19:00").getTime();
              let end = new Date(
                `${formatter.dateFormat(selectedBid.Chrqedate)}T${formatter.formatTime(selectedBid.Chrqetime)}`
              ).getTime();
              this._cdTrigger = new sap.ui.core.IntervalTrigger(100);
              this._cdTrigger.addListener(function () {
                let current = new Date().getTime();
                let difference = isNaN(end - current) ? 0 : end - current < 0 ? 0 : end - current;
                that._startCountdown(difference, start, end);
              });
            }
          }
          this._BusyDialog.close();
          clearTimeout(this._BusyTimeout);
        } catch (error) {
          const oRouter = this.getOwnerComponent().getRouter();
          let that = this;
          sap.m.MessageBox.error("Something went wrong, please check logs.", {
            onClose: function () {
              oRouter.navTo("RouteMain", {}, null, true);
              if (that._BusyDialog) that._BusyDialog.close();
              // sap.ui.core.BusyIndicator.hide();
            },
          });
          console.log(error);
        }
      },

      _startCountdown: function (diff, start, end) {
        let percentage = (diff * 100) / (end - start);
        let hour = Math.floor(diff / (1000 * 60 * 60));
        let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor(((diff % (1000 * 60 * 60)) % (1000 * 60)) / 1000);
        let time = `Time Left - ${hour.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}:${minutes.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}:${seconds.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}`;
        this.byId("radialClock").setPercentage(percentage);
        this.byId("timeLeftCell").setText(time);
        if (percentage > 50) {
          this.byId("radialClock").setValueColor(LIGHTGREEN);
        } else if (percentage <= 50 && percentage > 25) {
          this.byId("radialClock").setValueColor(GREEN);
        } else if (percentage <= 25 && percentage > 10) {
          this.byId("radialClock").setValueColor(ORANGE);
        } else if (percentage <= 10 && percentage > 0) {
          this.byId("radialClock").setValueColor(RED);
        } else {
          // this.byId("radialClock").setPercentage(percentage);
          // this._rankTrigger.setInterval(0);
          this._cdTrigger.setInterval(-1);
          this._iInterval.setInterval(-1);
          // this.byId("fCostInputButton").setEnabled(false);
        }
      },

      _fetchFromService: function (sPath, filter = undefined) {
        let oModel = this.getOwnerComponent().getModel();
        if (filter) {
          return new Promise(function (resolve, reject) {
            oModel.read(sPath, {
              urlParameters: {
                $filter: filter,
              },
              success: function (oData) {
                if (oData.results) {
                  resolve(oData.results);
                } else {
                  resolve(oData);
                }
              },
              error: function (oResponse) {
                console.log(oResponse);
              },
            });
          });
        } else {
          return new Promise(function (resolve, reject) {
            oModel.read(sPath, {
              success: function (oData) {
                if (oData.results) {
                  resolve(oData.results);
                } else {
                  resolve(oData);
                }
              },
              error: function (oResponse) {
                console.log(oResponse);
              },
            });
          });
        }
      },
      _setCurrentBids: async function () {
        let that = this;
        let selectedCharterNo = this.getOwnerComponent().getModel("nav").getProperty("/navigatedCharterno");
        // let selectedVoyno = this.getOwnerComponent()
        //   .getModel("nav")
        //   .getProperty("/navigatedVoyno");
        let currentBids = await this._fetchFromService("/InvBidSet", `Chrnmin eq '${selectedCharterNo}'`);
        let rankModel = this.getView().getModel("rankmodel");
        let rankModelData = rankModel.getData();
        let currentBidTable = [];
        let rankPromise = new Promise(function (resolve, reject) {
          if (currentBids.length) {
            currentBids.forEach((bid, bidIndex) => {
              rankModelData.forEach(async (el, index) => {
                if (el.Lifnr === bid.Lifnr) {
                  rankModelData[index].currentBid = bid.Cvalue
                    ? oCurrencyFormat.format(bid.Cvalue, /* "USD" */ bid.Cunit)
                    : rankModelData[index].originalBid;
                  rankModelData[index].currentBidValue = bid.Cvalue;
                  if (Number(bid.Cvalue)) {
                    let bidRank = await that._fetchFromService(
                      `/LiveRankSet(IvChrnmin='${selectedCharterNo}',IvLifnr='${bid.Lifnr}',IvVoyno='')`,
                      undefined
                    );
                    rankModelData[index].CRank = `L${bidRank.IvRank}`;
                    if (rankModelData[index].CRank === "L1") {
                      that._setTopRankToTile(rankModelData);
                    }
                  }
                  rankModel.refresh();
                  if (bidIndex + 1 === currentBids.length) {
                    resolve();
                  }
                }
              });
            });
          } else {
            reject();
          }
        });
        rankPromise.then(
          function () {
            if (rankModelData.length > currentBids.length) {
              rankModelData.forEach((el, index) => {
                if (!el.currentBidValue) {
                  rankModelData[index].currentBid = el.originalBid;
                  rankModelData[index].currentBidValue = el.originalBidValue;
                  rankModel.refresh();
                }
                currentBidTable.push({
                  Lifnr: el.Lifnr,
                  currentBid: el.currentBidValue,
                });
              });
              currentBidTable.sort((a, b) => a.currentBid - b.currentBid);
              rankModelData.forEach((el, index) => {
                let sortedBidRank = currentBidTable.findIndex((bid) => bid.Lifnr === el.Lifnr) + 1;
                rankModelData[index].CRank = `L${sortedBidRank}`;
                rankModel.refresh();
                if (rankModelData[index].CRank === "L1") {
                  that._setTopRankToTile(rankModelData);
                }
              });
            }
          },
          function () {
            if (!currentBids.length) {
              rankModelData.forEach((el, index) => {
                rankModelData[index].currentBid = el.originalBid;
                rankModelData[index].currentBidValue = el.originalBidValue;
                rankModel.refresh();

                currentBidTable.push({
                  Lifnr: el.Lifnr,
                  currentBid: el.currentBidValue,
                });
              });
              currentBidTable.sort((a, b) => a.currentBid - b.currentBid);
              rankModelData.forEach((el, index) => {
                let sortedBidRank = currentBidTable.findIndex((bid) => bid.Lifnr === el.Lifnr) + 1;
                rankModelData[index].CRank = `L${sortedBidRank}`;
                rankModel.refresh();
                if (rankModelData[index].CRank === "L1") {
                  that._setTopRankToTile(rankModelData);
                }
              });
            }
          }
        );
      },

      _setTopRankToTile: function (rankModelData) {
        let topRankData = rankModelData.find((el) => el.CRank === "L1");
        this.byId("topCommTile").setValue(`${topRankData.Name1} ${topRankData.Name2}`).setIndicator("Up");
        this.byId("commTileContent").setFooter(`Technical Score: ${topRankData.TRank}`);
        this.byId("commTile").setSubheader(`Quote: ${topRankData.currentBid}`);
      },

      onQuoteSubmit: function (oEvent) {
        let that = this;
        let chrnmin = this.getOwnerComponent().getModel("nav").getProperty("/navigatedCharterno");
        let iQuote = this.byId("quoteInput").getValue();
        let oModel = this.getOwnerComponent().getModel();
        oModel.create(
          "/SetQuoteSet",
          {
            IvChat: `${chrnmin}`,
            IvQuote: `${iQuote}`,
          },
          {
            success: function (oData) {
              that.byId("currentQuote").setValue(oData.IvQuote);
            },
            error: function (oResponse) {
              console.log(oResponse);
            },
          }
        );
      },

      onStart: function (oEvent) {
        let that = this;
        let chrnmin = this.getOwnerComponent().getModel("nav").getProperty("/navigatedCharterno");
        let oModel = this.getOwnerComponent().getModel();
        oModel.create(
          "/SetQuoteSet",
          {
            IvChat: `${chrnmin}`,
            IvQuote: "0",
            IvStart: "START",
          },
          {
            success: async function (oData) {
              that.byId("currentQuote").setValue(oData.IvQuote);
              await that.getOwnerComponent().getModel("nav").setProperty("/navigatedMode", "AUTO");
              that._onObjectMatched({});
            },
            error: function (oResponse) {
              console.log(oResponse);
            },
          }
        );
      },
    });
  }
);
