var deleteHandler;
var overrideRedirect= null;
function sendFileToServer(formData,status)
{
	var uploadURL ="";//Upload URL
	var extraData ={};//Extra Data.
	var jqXHR=$.ajax({
			xhr: function() {
			var xhrobj = $.ajaxSettings.xhr();
			if (xhrobj.upload) {
					xhrobj.upload.addEventListener('progress', function(event) {
						var percent = 0;
						var position = event.loaded || event.position;
						var total = event.total;
						if (event.lengthComputable) {
							percent = Math.ceil(position / total * 100);
						}
						//Set progress
						status.setProgress(percent);
					}, false);
				}
			return xhrobj;
		},
	url: uploadURL,
	type: "POST",
	contentType:false,
	processData: false,
		cache: false,
		data: formData,
		success: function(data){
			status.setProgress(100);


		}
	});

	status.setAbort(jqXHR);
	status.setDelete();
	$("#checkbox-nosubmission").attr('disabled', true);
	$(".form-checkbox").css({opacity: 0.5});
}

var rowCount=0;

$(".delete").click(function(){

});


$("#checkbox-nosubmission").click(function(){

var numOfVisibleRows = $('.statusbar:visible').length;


	if($(this).is(':checked')){

		$(".dragDrop").unbind();
		$(".well").css({opacity: 0.5});

		$("#nextBtn").removeAttr('disabled');
		$("#nextHref").attr("href", "/check-and-send");


	}else{

		if(numOfVisibleRows>1){
			$(".dragDrop").bind("click", handler());
			$(".well").css({opacity: 1});
			$("#nextBtn").removeAttr('disabled');
			//$("#nextHref").attr("href", "/errors");

			}else{
			$(".dragDrop").bind("click", handler());
			$(".well").css({opacity: 1.0});
			$("#nextBtn").attr('disabled',true);
			$("#nextHref").removeAttr("href");


		}

	}
});
function deleteHandler(){

}

function createStatusbar(obj)
{
	 rowCount++;
	 var row="odd";
	 if(rowCount %2 ==0) row ="even";
	 if(rowCount >= 1){
		document.getElementById("statusbar-header").style.display = "inherit";
	 }
	 this.statusbar = $("<div class='statusbar2 "+row+"'></div>");
	 this.filename = $("<div class='filename2'></div>").appendTo(this.statusbar);
	 //this.size = $("<div class='filesize'></div>").appendTo(this.statusbar);
	 this.progressBar = $("<div class='progressBar2'><div></div></div>").appendTo(this.statusbar);
	 this.abort = $("<a class='abort'>Cancel</a>").appendTo(this.statusbar);
	 this.delete2 = $("<a id='delete' class='delete' style='display:none;margin-left:25px;'>Remove file</a>").appendTo(this.statusbar);
	 $("#uploadOldId").attr('disabled',true);
	 $("#uploadOldId").unbind();
	 obj.before(this.statusbar);

	this.setFileNameSize = function(name,size)
	{
		var sizeStr="";
		var sizeKB = size/1024;
		if(parseInt(sizeKB) > 1024)
		{
			var sizeMB = sizeKB/1024;
			sizeStr = sizeMB.toFixed(2)+" MB";
		}
		else
		{
			sizeStr = sizeKB.toFixed(2)+" KB";
		}

		this.filename.html(name);
		//this.size.html(sizeStr);
	}
	this.setProgress = function(progress)
	{
		var progressBarWidth =progress*this.progressBar.width()/ 100;
		this.progressBar.find('div').animate({ width: progressBarWidth }, 10).html(progress + "% ");
		if(parseInt(progress) >= 100)
		{
			this.progressBar.find('div').css({width: progressBarWidth,"width":"200px","text-align":"left","padding-left":"5px"}).html("Done");

			this.abort.hide();
			this.delete2.show();
			$("#nextBtn").removeAttr('disabled');
			//$("#nextHref").attr("href", "/errors");
		}
	}
	this.setAbort = function(jqxhr)
	{
		var sb = this.statusbar;
		this.abort.click(function()
		{
			jqxhr.abort();
			sb.hide();
		});
	}

	this.setDelete = function()
	{
		var sb = this.statusbar;
		this.delete2.click(function()
		{

		if($("#checkbox-nosubmission").is(':checked')){
			return false;
		}else{
			sb.hide();
			sb.removeClass("statusbar");
			if($(".statusbar").length <2){
				$("#nextBtn").attr('disabled',true);
				$("#nextHref").removeAttr("href");
				$("#checkbox-nosubmission").removeAttr('disabled');
				$(".form-checkbox").css({opacity: 1});
			}
		}
		if($(".statusbar").length <1){
			document.getElementById("statusbar-header").style.display = "none";
			$("#uploadOldId").attr('disabled',false);
			$("#uploadOldId").click(function(){
	        $("#tempFileId").click();
	    });
		}
		});
	}
}

function handleFileUpload(files,obj)
{
	console.log("handlefileupload");
	console.log(files);
   for (var i = 0; i < files.length; i++)
   {
		var fd = new FormData();
		fd.append('file', files[i]);

		var status = new createStatusbar(obj); //Using this we can set progress.
		var name = files[i].name;
		if (name.length > 30)
		{
			name = name.substring(0, 30) + '...';
		}

		if(name.indexOf("2") >= 0) {
			$("#nextHref").removeAttr("href");
			$("#nextHref").attr("href", "/file-upload/there-is-a-problem");
		/*} else if(name.indexOf("3") >= 0) {
			$("#nextHref").removeAttr("href");
			$("#nextHref").attr("href", "/format-errors-2");*/
		} else if(overrideRedirect != null){
			$("#nextHref").removeAttr("href");
			$("#nextHref").attr("href", overrideRedirect);
		}
		 else {
			$("#nextHref").removeAttr("href");
			$("#nextHref").attr("href", "/file-upload/check-report");
		}

		status.setFileNameSize(name,files[i].size);

		sendFileToServer(fd,status);

   }
}

var handler = function start(){
	var obj = $("#dragandrop");
	obj.on('dragenter', function (e)
	{
		e.stopPropagation();
		e.preventDefault();
		$(this).css('border', '3px dashed #2E8ACA');
		$(this).css('background', '#F8F8F8');
	});
	obj.on('dragover', function (e)
	{
		 e.stopPropagation();
		 e.preventDefault();
	});
	obj.on('drop', function (e)
	{
		 e.preventDefault();
		 var files = e.originalEvent.dataTransfer.files;
		 //console.log("Drop Function: "+e.originalEvent.dataTransfer.files);
		 //console.log("Drop Function 2: "+e.target.files);
		 //We need to send dropped files to Server
		 handleFileUpload(files,obj);
	});
	$(document).on('dragenter', function (e)
	{
		e.stopPropagation();
		e.preventDefault();
	});
	$(document).on('dragover', function (e)
	{
	  e.stopPropagation();
	  e.preventDefault();
	});
	$(document).on('drop', function (e)
	{
		obj.css('border', '3px solid #DEE0E2');
		obj.css('background', '#DEE0E2');
		e.stopPropagation();
		e.preventDefault();
	});
}

$(document).ready(function()
{
	handler();
});

jQuery(function($){
    var obj = $("#dragandrop");

    $("#uploadOldId").click(function(){
        $("#tempFileId").click();
    });

    $( "#tempFileId" ).change(function(){
        var tempFiles = $("#tempFileId");
        handleFileUpload(tempFiles[0].files,obj);
        $("#tempFileId").val('');
    });

});
