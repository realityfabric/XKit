//* TITLE Soft Refresh **//
//* VERSION 0.4 REV D **//
//* DESCRIPTION Refresh without refreshing **//
//* DEVELOPER STUDIOXENIX **//
//* DETAILS This extension allows you to see new posts on your dashboard without refreshing the page. When you get the New Posts bubble, click on the Tumblr logo, and new posts will appear on your dashboard.<br><br>If you still want to refresh the page completely (perform a Hard Refresh), hold the ALT key while clicking on logo and the page will refresh.<br><br>Please note that this extension is highly experimental, and might not work properly all the time. **//
//* FRAME false **//
//* BETA false **//
//* SLOW true **//

XKit.extensions.soft_refresh = new Object({

	running: false,
	slow: true,
	loading: false,
	default_page_title: document.title,
        preferences: {
		"use_logo":{
			text:"Soft refresh when the tumblr logo is clicked.",
			default:true,
			value:true
		},
		"use_home_button":{
			text:"Soft refresh when the home button is clicked.",
			default:true,
			value:true
		},
		"show_notifications":{
			text:"Show refresh result notifications",
			default:true,
			value:true
		}
	},


	run: function() {
		this.running = true;

		XKit.tools.init_css("soft_refresh");
		if (document.location.href.indexOf("://www.tumblr.com/dashboard") === -1) {
			// Not in dashboard, quit.
			return;
		}

		$(".logo_anchor").attr('data-old-href', $(".logo_anchor").attr('href'));
		if(this.preferences.use_logo.value == true){
			$(".logo_anchor").attr('onclick','return false');
			$(".logo_anchor").attr('href', '#');
			$(document).on("click", ".logo_anchor", XKit.extensions.soft_refresh.logo_clicked);
		}

		$("#home_button a").attr('data-old-href', $("#home_button a").attr('href'));
		if(this.preferences.use_home_button.value == true){
			$(document).on("click", "#home_button", XKit.extensions.soft_refresh.logo_clicked);
			// Need to change all children to make sure the user doesn't click the new posts count number.
			$("#home_button").children().attr('href','#');
		}

		XKit.extensions.soft_refresh.do_post_ids();

	},

	do_post_ids: function() {

		$(".post").each(function() {

			$(this).parent().attr('data-xkit-post-id', $(this).attr('data-post-id'));

		});

	},

	logo_clicked: function(event) {

		if (event.altKey) {
			location.reload(true);
			return;
		}
		XKit.extensions.soft_refresh.load_posts();

	},

	load_posts: function() {

		if (typeof XKit.extensions.filter_by_type !== "undefined") {
			if (XKit.extensions.filter_by_type.running === true) {
				if (XKit.extensions.filter_by_type.current_filter !== "0") {
					location.reload(true);
					return;
				}
			}
		}

		if (this.loading === true) { return; }
		this.loading = true;

		$("#new_post").after("<div id=\"xkit_soft_refresh\">Checking for new posts</div>");
		$("#xkit_soft_refresh").slideDown('fast');

		document.title = this.default_page_title;
		$("#new_post_notice_container").css("display","none");
		$("#new_post_notice_container .tab_notice_value").html("0");

		function soft_refresh_hit_triggers() {

			if (typeof Tumblr === "undefined") {
				window.top.Tumblr.Events.trigger("posts:load");
				window.top.Tumblr.AudioPlayer.update_all();
				window.top.Tumblr.Events.trigger("DOMEventor:updateRect");
			} else {
				Tumblr.Events.trigger("posts:load");
				Tumblr.AudioPlayer.update_all();
				Tumblr.Events.trigger("DOMEventor:updateRect");
			}

		}

		GM_xmlhttpRequest({
			method: "GET",
			url: "http://www.tumblr.com/dashboard/",
			onerror: function(response) {
				$("#xkit_soft_refresh").slideUp('fast', function(){ $(this).remove(); });
				XKit.extensions.soft_refresh.show_cant_load_error();
				XKit.extensions.soft_refresh.loading = false;
			},
			onload: function(response) {
				$("#xkit_soft_refresh").slideUp('fast', function(){ $(this).remove(); });
				var resText = response.responseText;
				// Fixes the add_to_image_queue bug that causes this addon to stop working.
				// Problem is that the response code wants to call a page embedded function
				resText = resText.replace(/add_to_image_queue\(\'.*\'\)\;/g, "");
				var new_posts = $("ol#posts", resText).html();

				var m_count = 0;
				$($("ol#posts .post", resText).get().reverse()).each(function() {

					if ($(this).attr('id') == "new_post_buttons" || typeof $(this).attr('data-post-id') == "undefined")
						return;

					console.log("post ID = " + $(this).attr('data-post-id'));
					var exists = $("[data-post-id='" + $(this).attr('data-post-id') + "']").length > 0;
					exists = exists || $("[data-xkit-post-id='" + $(this).attr('data-post-id') + "']").length > 0;
					console.log("exists  = " + exists);

					if (exists == false) {

						m_count++;
						if ($(".new_post_buttons_container").length > 0) {
							$(".new_post_buttons_container").after($(this).parent()[0].outerHTML);
						} else {
							$("#new_post").after($(this)[0].outerHTML);
						}

					}

				});
				$("html, body").animate({ scrollTop: 0 }, "slow");
				XKit.extensions.soft_refresh.do_post_ids();

				if (m_count === 0) {
					if (XKit.extensions.soft_refresh.preferences.show_notifications.value === true) {
						XKit.notifications.add("No new posts found.","info");
					}
				} else {
					XKit.tools.add_function(soft_refresh_hit_triggers, true, "");
					XKit.extensions.soft_refresh.check_embeds();
					if (XKit.extensions.soft_refresh.preferences.show_notifications.value === true) {
						XKit.notifications.add("Added " + m_count + " new posts.","ok");
					}
				}
				XKit.extensions.soft_refresh.loading = false;
			}
		});

	},

	check_embeds: function() {

		if ($("body").find(".inline_embed").length > 0) {
			$("body").find(".inline_embed").each(function() {

				try {
					var script = document.createElement("script");
					script.textContent = $(this).html();
					document.body.appendChild(script);
					$(this).remove();
				} catch(e) {
					alert(e.message);
				}

			});
		}

	},

	show_cant_load_error: function() {

		XKit.window.show("Can't get new posts","I could not fetch the page requested. There might be a problem with Tumblr servers, please try again later, or click on the Refresh the Page button to refresh it manually.","error","<div class=\"xkit-button default\" id=\"xkit-close-message\">OK</div><a href=\"/dashboard/\" class=\"xkit-button\">Refresh the page</a>");

	},

	destroy: function() {

		$(".logo_anchor").attr('href', $(".logo_anchor").attr('data-old-href'));
		$(document).off("click", ".logo_anchor", XKit.extensions.soft_refresh.logo_clicked);
		$(".logo_anchor").attr('onclick','');

		$("#home_button a").attr('href', $("#home_button a").attr('data-old-href'));
		$(document).off("click", "#home_button", XKit.extensions.soft_refresh.logo_clicked);
		$("#home_button").attr('onclick','');
		$("#home_button").children().attr('href',$("#home_button a").attr('data-old-href'));

		XKit.tools.remove_css("soft_refresh");
		this.running = false;
	}

});