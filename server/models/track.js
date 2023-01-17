"use strict";
module.exports = function(sequelize, DataTypes) {
  const Track = sequelize.define(
    "Track",
    {
      datetime: {
        type: DataTypes.DATE,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      lng: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lat: {
        type: DataTypes.STRING,
        allowNull: false
      },
      timestamp: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      freezeTableName: true,
      tableName: "track",
      timestamps: false,
      underscored: true
    }
  );
  return Track;
};
