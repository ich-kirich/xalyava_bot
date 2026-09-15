"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("todayPost", "postText", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("todayPost", "postText", {
      type: Sequelize.STRING(4096),
      allowNull: false,
    });
  },
};
