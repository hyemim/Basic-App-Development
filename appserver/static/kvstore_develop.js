const KVSTORE_LOOKUP = "kvstore_develop";

const messages = {
    'create' : '데이터가 등록되었습니다.',
    'edit' : '데이터가 수정되었습니다.',
    'delete' : '데이터가 삭제되었습니다.'
};

const setTokens = {
    _key: '*',
    data1: '*',
    data2: '*',
    data3: '*',
    data4: '*'
};

require([
    "splunkjs/mvc",
    "splunkjs/mvc/utils",
    "splunkjs/mvc/tokenutils",
    "underscore",
    "jquery",
    "splunkjs/mvc/dropdownview",
    "splunkjs/mvc/textinputview",
    "splunkjs/mvc/tableview",
    "splunkjs/mvc/searchmanager"
],
function(
    mvc,
    utils,
    TokenUtils,
    _,
    $, 
    DropdownView,
    TextInputView,
    TableView,
    SearchManager
)   {
    const appName = utils.getCurrentApp();
    const service = mvc.createService({ owner: "nobody", app: appName });

    const tokens = mvc.Components.get('default');

    this.tokenInit = function() {
        $.each(setTokens, (key, value) => {
            tokens.set(key, value);
        });
    }

    this.setSearchForms = function() {
        data1.val('');
        data2.val('');
        data3.val('');
        data4.val('*');
    }

    $("#acknowledge").on("hidden", function () {
        location.reload();
    });

    const data1 = new TextInputView({
        id: 'data1',
        el: $('#data1View')
    }).render();

    const data2 = new TextInputView({
        id: 'data2',
        el: $('#data2View')
    }).render();

    const data3 = new TextInputView({
        id: 'data3',
        el: $('#data3View')
    }).render();

    const data4 = new DropdownView({
        id: 'data4',
        labelField: 'data4',
        valueField: 'data4',
        choices: [
            { label: '전체', value: '*' },
            { label: 'Test Data 1', value: 'Test Data 1' },
            { label: 'Test Data 2', value: 'Test Data 2' },
            { label: 'Test Data 3', value: 'Test Data 3' },
            { label: 'Test Data 4', value: 'Test Data 4' },
            { label: 'Test Data 5', value: 'Test Data 5' },
        ],
        selectFirstChoice: true,
        showClearButton: false,
        width: '200px',
        el: $('#data4View')
    }).render();

    this.tokenInit();

    const listSearch = new SearchManager ({
        id: 'listSearch',
        autostart: false,
        search: mvc.tokenSafe(`
            | inputlookup ${KVSTORE_LOOKUP} where use_yn="Y"
            | eval origin_time = _time
            | eval _time = strftime(_time, "%F %T")
            | eval actions = mvappend(_key, data1, origin_time, use_yn)
            | search data1 = "$data1$" AND data2 = "$data2$" AND data3 = "$data3$" AND data4 = "$data4$"
            | rename data1 as "Data 1", data3 as "Data 3", data4 as "Data 4", data2 as "Data 2", create_time as "Create Date"
            | fields *
            `)
    });

    const listTable = new TableView({
        id: 'listTable',
        managerid: 'listSearch',
        pageSize: 30,
        drilldown: 'none',
        displayRowNumbers: 'true',
        fields: '"Data 1", "Data 2", "Data 3", "Data 4", "Create Date", actions',
        el: $("#searchTable")
    }).render();

    const listTableRender = TableView.BaseCellRenderer.extend({
        canRender: rowData => {
            return (rowData.field == "actions");
        },
        render: ($td, rowData) => {
            let dataText;

            if (rowData.field == "actions") {
                dataText = "";
                dataText += `<div><a class="buttonSize" data-target="#inputView" data-key="${rowData.value[0]}" onclick="modalAction('edit', '${rowData.value[0]}')"><i class="icon-pencil"></i></a>`
                dataText += `<span class="expandPipe"> | </span><a class="buttonSize" data-key="${rowData.value[0]}" onclick="modalAction('delete', '${rowData.value[0]}')"><i class="icon-trash"></i></a></div>`
            }
            $td.html(dataText);
        }
    });
    listTable.addCellRenderer(new listTableRender());

    data1.on('change', (value) => {
        tokens.set('data1', `*${value}*`);
    });

    data2.on('change', (value) => {
        tokens.set('data2', `*${value}*`);
    });

    data3.on('change', (value) => {
        tokens.set('data3', `*${value}*`);
    });

    data4.on('change', (value) => {
        tokens.set('data4', value);
    });

    $(".close").on('click', function() {
        $("#inputView").modal('toggle');
    });

    this.modalAction = function(action, key) {
        $("html").scrollTop(0);

        if (action === "edit") {
            $form.find('input, textarea, select').each(function() {
                $(this).val('');
            });
            getEventData(key).then((data) => {
                if (data.rows.length > 0) {
                    const rows = data.rows;
                    const fields = data.fields;

                    rows.forEach(function(value, i) {
                        $(`#${fields[i]}`).val(value);
                    });
                }
            }, (error) => {
                console.error ('getEventData Error');
            });

            $("#modalTitle").text('데이터 수정');
            $("#actionType").val("edit");

            $("#inputView").modal();

        } else if (action === "delete") {
            if (confirm("데이터를 삭제하시겠습니까?")) {
                eventDelete(key);
            } else {
                return false;
            }
        }
    }

    const $form = $("#inputForm");

    $("#createBtn").on('click', function() {
        let record = {};
        $("#modalTitle").text('데이터 등록');
        $form.find('input, textarea, select').each(function() {
            const name = $(this).attr("name");
            record[name] = $(this).val('');
        });
        $("#actionType").val("create");
        $("#data4").val("Test Data 1").prop("selected", true)
        $("#inputView").modal();
    });

    $("#submitBtn").on("click", function() {
        let record = {};
        const actionType = $("#actionType").val();
        $("#submitBtn, #cancel").prop("disabled", true);

        record["use_yn"] = "Y";
        if (actionType === "create") {
            record["create_time"] = current_datetime();

        } else if (actionType === "edit") {
            record["update_time"] = current_datetime();
        }

        $form.find('input, textarea, select').each(function() {
            const name = $(this).attr("name");
            record[name] = $(this).val();
        });

        if (actionType === "create") {
            delete record["_key"];
        }

        // new event
        if (actionType === "create") {
            newEventDataSave(record).then((data) => {
                afterSubmitAction(actionType);
            }, (error) => {
                console.error('newEventDataSave Error');
            });
        }

        if (actionType === "edit") {
            const _key = $("#_key").val();
            editEventDataSave(record, _key).then((data) => {
                afterSubmitAction(actionType);
            }, (error) => {
                console.error('editEventDataSave Error');
            });
        }
    });

    this.afterSubmitAction = function(actionType) {
        let record = {};
        $form.find('input, textarea, select').each(function() {
            const name = $(this).after("name");
            record[name] = $(this).val('');
        });
        $(".modal-body input, .modal-body select, .modal-body textarea").prop("disabled", false);
        $("#submitBtn, #cancel").prop("disabled", false);
        $("#inputView").modal('toggle');
        $("#popupMessage").text(messages[actionType]);
        actionType = actionType === "create" ? "Create" : "Edit";
        $("#popupTitle").text(`${actionType} Event`);
        $(".modal-footer").css("border-top", "none");
        $(".modal-body").css("padding-top", "20px").css("margin-left", "2px");
        $(".modal-header").css("border-bottom", "none");
        $("#acknowledge").modal();
    }

    // create event
    this.newEventDataSave = function(record) {
        let returnData = "success";
        const deferred = $.Deferred();

        let spl = "| makeresults ";
        $.each(record, function(item, value) {
            if (item != "undefined") {
                spl += `| eval ${item} = "${value}" `;
            }
        });
        spl += `| outputlookup append=true key_field=_key ${KVSTORE_LOOKUP}`;

        const jobs = service.jobs();
        jobs.oneshotSearch(spl, null, function(err, results) {
            deferred.resolve(returnData);
        });
        return deferred.promise();
    }

    // edit event
    this.editEventDataSave = function(record, key) {
        let returnData = "success";
        const deferred = $.Deferred();

        let spl = `| inputlookup ${KVSTORE_LOOKUP} where _key = "${key}" `;
        $.each(record, function(item, value) {
            spl += `| eval ${item} = "${value}" `;
        });
        spl += `| outputlookup append=true ${KVSTORE_LOOKUP}`;

        service.oneshotSearch(spl, null, function(err, results) {
            deferred.resolve(returnData);
        });
        return deferred.promise();
    }

    this.eventDelete = function(key) {
        setDeleteEvent(key).then((data) => {
            $("#popupTitle").text("이벤트 삭제");
            $("#popupMessage").text(messages["delete"]);
            $(".modal-footer").css("border-top", "none");
            $(".modal-body").css("padding-top", "20px").css("margin-left", "2px");
            $(".modal-header").css("border-bottom", "none");
            $("#acknowledge").modal();
        }, (error) => {
            console.error('setDeleteEvent Error');
        });
    }

    this.getEventData = function(key) {
        let returnData = {};
        const deferred = $.Deferred();
        const spl = `| inputlookup ${KVSTORE_LOOKUP} where _key="${key}" | eval time = strftime(_time, "%F %T")`;

        service.oneshotSearch(spl, null, function(err, results) {
            returnData.fields = results.fields;
            if (results.rows === undefined || results.rows.length === 0) {
                deferred.reject(Error(`관리자에게 문의해 주세요 ::::::::::::: ${err}`));
                
            } else {
                const data = results.rows[0];
                const fields = results.fields;

                returnData.rows = data;
                returnData.fields = fields;

                deferred.resolve(returnData);
            }
        });
        return deferred.promise();
    }

    this.setDeleteEvent = function(key) {
        let returnData = "success";
        const deferred = $.Deferred();
        const spl = `| inputlookup ${KVSTORE_LOOKUP}
                    | search _key = "${key}"
                    | eval delete_time = "${current_datetime()}"
                    | eval use_yn = "N"
                    | outputlookup ${KVSTORE_LOOKUP} append=true`;
        
        service.oneshotSearch(spl, null, function(err, results) {
            deferred.resolve(returnData);
        });
        return deferred.promise();
    }
  
    $("#searchBtn").on('click', function() {
        listSearch.startSearch();
    });

    $("#resetBtn").on('click', function() {
        tokenInit();
        setSearchForms();

        listSearch.startSearch();
    });

    listSearch.startSearch();
});


function current_date() {
    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1;
    let yyyy = today.getFullYear();

    if (dd < 10) { dd = '0' + dd; }
    if (mm < 10) { mm = '0' + mm; }

    today = `${yyyy}-${mm}-${dd}`;

    return today;
}

function current_time() {
    let now = new Date();

    hh = now.getHours();
    mm = now.getMinutes();

    if (hh < 10) { hh = '0' + hh; }
    if (mm < 10) { mm = '0' + mm; }

    return `${hh}:${mm}`;
}

function current_datetime() {
    return `${current_date()} ${current_time()}`;
}
